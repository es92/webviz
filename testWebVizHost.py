

from webVizHost import Vizr

import time

vizr = Vizr()
vizr.serve()

print 'started'

gc = vizr.add2D('global cost')

vizr.addLayoutHint('everything', {
  '0': { 'data': [ gc ], 'position': [ 0, 0 ] },
}, isDefault=True)

N = 1


from webVizUtils import nonblocking_raw_input
from webVizUtils import nonblockingLooper

print 'looping'

t0 = time.time()
def compute():
  if time.time() < t0+5:
    return True
  else:
    return False
nonblockingLooper(compute)

print 'testing user input'

x = nonblocking_raw_input(':')

print 'adding Data'

for i in xrange(1000):
  gc.extend([N], [N**2])
  time.sleep(1)
  N += 1

print 'blocking on server'

vizr.join()
