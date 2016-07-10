
import sys
import select

def nonblocking_raw_input(message):
    sys.stdout.write(message)
    sys.stdout.flush()
    select.select([sys.stdin], [], [])
    return sys.stdin.readline()

def nonblockingLooper(fn):
  import eventlet

  Q = eventlet.Queue()

  def efn():
    try:
      c = fn()
    except Exception as e:
      Q.put(('e', e))
    Q.put(('r', c))
  while True:
    eventlet.spawn(efn)
    t, msg = Q.get()
    if t == 'e':
      exc = msg
      raise exc
    elif t == 'r':
      c = msg
      if not c:
        break
