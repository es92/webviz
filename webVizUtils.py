
import sys
import select

def nonblocking_raw_input(message):
    sys.stdout.write(message)
    sys.stdout.flush()
    select.select([sys.stdin], [], [])
    return sys.stdin.readline()[:-1]

def nonblockingLooper(fn):
  import eventlet

  Q = eventlet.Queue()

  def efn():
    try:
      c = fn()
    except Exception as e:
      import traceback
      Q.put(('e', (e, traceback.format_exc())))
      return
    Q.put(('r', c))
  while True:
    eventlet.spawn(efn)
    t, msg = Q.get()
    if t == 'e':
      exc, f_exc = msg
      print '==========================='
      print f_exc
      print '==========================='
      raise exc
    elif t == 'r':
      c = msg
      if not c:
        break
