

from webVizHost import Vizr

import time

vizr = Vizr()
vizr.serve()

print 'started'

gc = vizr.add2D('global cost')

N = 1

for i in xrange(10):
  gc.extend([N], [N*2])
  time.sleep(1)
  N += 1

vizr.join()
