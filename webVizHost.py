
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
                                    stdin=subprocess.PIPE, preexec_fn=os.setpgrp)
  def addLayoutHint(self, name, _hint, isDefault=False):
    hint = {}
    for windowNum, window in _hint.items():
      hint[windowNum] = { 'data': [ handle._name for handle in window['data'] ], 
                          'position': window['position'],
                          'isDefault': isDefault }
    self._sendMessage(('layoutHint', (name, hint)))
  def addSmooth2D(self, name, N=10):

    handle = self.add2D(name)

    all_ys = []

    def new_extend(xs, ys):
      all_ys.extend(ys)
      smooth_ys = [ float(np.mean(all_ys[len(all_ys)-N-(i-1):len(all_ys)-(i-1)])) for i in xrange(len(ys), 0, -1) ]
      return handle.extend(xs, smooth_ys)

    new_handle = Object()
    new_handle.extend = new_extend
    new_handle.replace = handle.replace
    new_handle._name = handle._name

    return new_handle
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

class VizrPage:
  def __init__(self, vizr):
    self.vizs = {}
    self.vizr = vizr
    self.ordered_vizs = []
  def addSmooth2D(self, name, coord, N=10):
    self.vizs[name] = [ self.vizr.addSmooth2D(name, N), coord ]
    self.ordered_vizs.append(self.vizs[name])
    return self.vizs[name][0]
  def add2D(self, name, coord):
    self.vizs[name] = [ self.vizr.add2D(name), coord ]
    self.ordered_vizs.append(self.vizs[name])
  def makeDefault(self):

    coord_to_vizs = {}

    for (v, c) in self.ordered_vizs:
      coord_to_vizs.setdefault(tuple(c), [])
      coord_to_vizs[tuple(c)].append(v)

    boxes = {}
    for i, (c, vs) in enumerate(coord_to_vizs.items()):
      boxes[str(i)] = { 'data': vs, 'position': c }

    self.vizr.addLayoutHint('everything', boxes)
  def __contains__(self, key):
    return key in self.vizs
  def __getitem__(self, key):
    return self.vizs[key][0]
