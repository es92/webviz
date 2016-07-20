
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

print 'adding Data'

for i in xrange(1000):
  gc.extend([N], [N**2])
  time.sleep(1)
  N += 1

print 'blocking on server'

