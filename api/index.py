import os
import sys

# Ensure repository root is on sys.path so 'backend' package imports resolve cleanly
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from backend.main import app

# Export app for Vercel Serverless WSGI/ASGI handler
app = app
