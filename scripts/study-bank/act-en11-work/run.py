import json, sys
sys.path.insert(0, __import__('os').path.dirname(__file__))
from common import OUT
import pa
try:
    import pb
except ImportError: pass
try:
    import pc
except ImportError: pass
for m in ['pd','pe','pf']:
    try: __import__(m)
    except ModuleNotFoundError: pass
print(len(OUT), 'items')
if len(sys.argv) > 1:
    json.dump(OUT, open(sys.argv[1], 'w'), indent=1, ensure_ascii=False)
