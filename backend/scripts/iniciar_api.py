"""
Script para iniciar o servidor FastAPI
Execute: python scripts/iniciar_api.py
"""
import sys
from pathlib import Path
ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))

import uvicorn
from config.settings import settings

if __name__ == "__main__":
    print("="*60)
    print(" Iniciando API de Gestão de Senhas")
    print("="*60)
    print(f" URL: http://localhost:{settings.api_port}")
    print(f" Docs: http://localhost:{settings.api_port}/docs")
    print(f" API Key: {settings.api_secret_key}")
    print("="*60)
    print("\n⏳ Aguarde o servidor iniciar...\n")
    
    uvicorn.run(
        "src.api.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=True,
        log_level="info"
    )
