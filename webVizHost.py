
import subprocess
import json
import os

import numpy as np

def filterToFinite(ns):
  return [ n if np.isfinite(n) else None for n in ns ]

class Object(object):
  pass

class Vizr:
  def serve(self, port=10012, processFreq=.25):
    dirname = os.path.dirname(os.path.abspath(__file__))
    pyPID = os.getpid()
    self.server = subprocess.Popen(['/usr/bin/node', dirname + '/webVizHost.js', 
                                     str(port), str(processFreq), str(pyPID)], 
                                    stdin=subprocess.PIPE)
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
      xs = filterToFinite(xs)
      ys = filterToFinite(ys)
      self._sendMessage(('addData', (name, 'extend', { 'x': xs, 'y': ys })))
    handle.extend = extend
    def replace(xs, ys):
      xs = filterToFinite(xs)
      ys = filterToFinite(ys)
      self._sendMessage(('addData', (name, 'replace', { 'x': xs, 'y': ys })))
    handle.replace = replace
    return handle
  def _sendMessage(self, msg):
    self.server.stdin.write(json.dumps(msg) + '\n')
    self.server.stdin.flush()
