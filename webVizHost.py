
import socketio
from flask import Flask
import eventlet
import eventlet.wsgi
import threading

import Queue

eventlet.monkey_patch()

class Object(object):
  pass

class Vizr:
  def __init__(self, logSIO=False):
    self.server = VizrServeThread(logSIO=logSIO)

    self.eventQueue = Queue.Queue()
    self.exceptionCheck = []
    
    self.serverThread = threading.Thread(target=self.server.start, args=(self.eventQueue,))
    self.serverThread.daemon = True

    self.eventQueueLoopThread = threading.Thread(target=eventQueueLoop, args=(self.eventQueue, self.server, self.exceptionCheck))
    self.eventQueueLoopThread.daemon = True
  def serve(self):
    self.serverThread.start()
    self.eventQueueLoopThread.start()
  def join(self):
    self.serverThread.join()
    self.eventQueueLoopThread.join()
    self._checkException()

  def addLayoutHint(self, name, _hint, isDefault=False):
    hint = {}
    for windowNum, window in _hint.items():
      hint[windowNum] = { 'data': [ handle._name for handle in window['data'] ], 
                          'position': window['position'],
                          'isDefault': isDefault }
    self._sendMessage(('layoutHint', (name, hint)))
  def add2D(self, name):
    self._sendMessage(('addDataInfo', (name, '2D')))
    handle = Object()
    handle._name = name
    def extend(xs, ys):
      self._sendMessage(('addData', (name, 'extend', { 'x': xs, 'y': ys })))
    handle.extend = extend
    return handle
  def _sendMessage(self, msg):
    self._checkException()
    self.eventQueue.put(('vizr', msg))
  def _checkException(self):
    if self.exceptionCheck:
      raise self.exceptionCheck[0]

def eventQueueLoop(eventQueue, server, exceptionCheck):
  clients = set()
  names = set()
  nameToData = {}
  nameToType = {}

  layoutHints = {}

  clientToSubscriptions = {}
  subscriptionToClients = {}

  def send(client, evt, data):
    if client == None:
      server.sendAll(evt, data)
    else:
      server.send(client, evt, data)

  def sendDataInfo(client):
    dataInfo = []
    for name in names:
      dataInfo.append({ 'name': name, 'type': nameToType[name] })
    send(client, 'vizDataInfo', dataInfo)

  def sendLayoutHints(client):
    send(client, 'layoutHints', layoutHints)

  def sendAllData(client, name):
    if name in nameToData:
      send(client, 'vizDataDelta', {
        'name': name,
        'deltaType': 'Override',
        'type': nameToType[name],
        'data': nameToData[name]
      });
  def sendDataUpdate(client, name, deltaType, update):
      send(client, 'vizDataDelta', dict({
        'name': name,
        'deltaType': deltaType,
        'type': nameToType[name] }, **update))

  def doException(s):
    e = Exception(s)
    exceptionCheck.append(e)
    raise e

  while True:
    msgtype, msg = eventQueue.get()
    if msgtype == 'server':
      evt, client, data = msg
      #print 'from server:', evt, client, data
      if evt == 'connect':
        clients.add(client)
        sendDataInfo(client)
        sendLayoutHints(client)
      elif evt == 'disconnect':
        clients.remove(client)
      elif evt == 'subscribe':
        name = data
        clientToSubscriptions.setdefault(client, set())
        clientToSubscriptions[client].add(name)
        subscriptionToClients.setdefault(name, set())
        subscriptionToClients[name].add(client)
        sendAllData(client, name)
      elif evt == 'unsubscribe':
        clientToSubscriptions[client].remove(name)
        subscriptionToClients[name].remove(client)
      else:
        doException('unknown vizr evt type ' + str(evt))
    elif msgtype == 'vizr':
      evt, data = msg
      #print 'from vizr:', evt, client, data
      if evt == 'addDataInfo':
        name, type = data
        names.add(name)
        nameToType[name] = type
        sendDataInfo(None)
      elif evt == 'layoutHint':
        name, hint = data
        layoutHints[name] = hint
        sendLayoutHints(None)
      elif evt == 'addData':
        name, deltaType, data = data
        type = nameToType[name]
        if type == '2D':
          if deltaType == 'extend':
            nameToData.setdefault(name, { 'x': [], 'y': [] })
            nameToData[name]['x'].extend(data['x'])
            nameToData[name]['y'].extend(data['y'])

            if name in subscriptionToClients:
              for client in subscriptionToClients[name]:
                sendDataUpdate(client, name, 'Extend', { 'data': { 'x': data['x'], 'y': data['y'] } })
          else:
            doException('unknown vizr data deltatype ' + str(type) + ' ' + str(deltaType))
        else:
          doException('unknown vizr data type ' + str(type))
      else:
        doException('unknown vizr evt type ' + str(evt))
    else:
      doException('unknown msg type ' + str(msgtype))

class VizrServeThread:
  def __init__(self, logSIO=False):
    self.logSIO = logSIO
    self.sendQueue = eventlet.Queue()
    self.stupidThread = None
  def sendAll(self, evt, data):
    self.sendQueue.put((None, evt, data))
  def send(self, client, evt, data):
    self.sendQueue.put((client, evt, data))
  def start(self, eventQueue):
    self.sio = socketio.Server(logger=self.logSIO, debug=True)
    self.flask = Flask(__name__, static_folder='client')

    def sendMsg(msg):
      eventQueue.put(('server', msg))

    #NOTE not fully sure how eventlet works, hoping this is ok
    def background_thread():
      while True:
        client, evt, data = self.sendQueue.get()
        if client == None:
          self.sio.emit(evt, data, namespace='/vizr')
        else:
          self.sio.emit(evt, data, namespace='/vizr', room=client)
    
    @self.flask.route('/')
    def root():
      return self.flask.send_static_file('index.html')

    @self.flask.route('/<path:path>')
    def static_proxy(path):
      return self.flask.send_static_file(path)

    @self.sio.on('connect', namespace='/vizr')
    def connect(sid, environ):
      if self.stupidThread == None:
        self.stupidThread = eventlet.spawn(background_thread)
      sendMsg(('connect', sid, None))

    @self.sio.on('subscribe', namespace='/vizr')
    def subscribe(sid, data):
      sendMsg(('subscribe', sid, data))

    @self.sio.on('unsubscribe', namespace='/vizr')
    def unsubscribe(sid, data):
      sendMsg(('unsubscribe', sid, data))

    @self.sio.on('disconnect', namespace='/vizr')
    def disconnect(sid):
      sendMsg(('disconnect', sid, None))

    import logging
    logger = logging.getLogger('Vizr.eventlet_wsgi')
    logger.setLevel(logging.WARNING)

    import sys

    ch = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    ch.setFormatter(formatter)
    logger.addHandler(ch)

    self.app = socketio.Middleware(self.sio, self.flask)
    eventlet.wsgi.server(eventlet.listen(('', 10012)), self.app, log=logger)
