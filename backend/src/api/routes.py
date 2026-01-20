import sys
from pathlib import Path

ROOT_DIR = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

from fastapi import APIRouter, HTTPException, Depends, Header, Request
from src.api.models import SolicitacaoSenha, RespostaSenha, HealthCheck, Company
import json
import os
from datetime import datetime
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)
router = APIRouter()

executor = ThreadPoolExecutor(max_workers=3)

from config.settings import settings

def verificar_api_key(x_api_key: str = Header(...)):
    """Valida a API Key"""
    if x_api_key != settings.api_secret_key:
        raise HTTPException(status_code=401, detail="API Key inválida")
    return x_api_key

def obter_ip_cliente(request: Request) -> str:
    """Obtém o IP real do cliente (considera proxies)"""
    # Tenta pegar de headers de proxy primeiro
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip
    
    # Fallback para IP direto
    if request.client:
        return request.client.host
    
    return "IP não disponível"

@router.get("/health", response_model=HealthCheck)
async def health_check():
    """Verifica se a API está online"""
    return {
        "status": "online",
        "versao": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }

@router.get("/listar-bases")
async def listar_bases(api_key: str = Depends(verificar_api_key)):
    """Lista todas as empresas disponíveis no Excel"""
    try:
        from src.utils.excel_handler import ExcelHandler
        
        handler = ExcelHandler(settings.excel_path)
        bases = handler.ler_bases()
        
        empresas_lista = bases['empresa'].tolist()
        
        logger.info(f"📋 Listadas {len(empresas_lista)} empresas")
        
        return {
            "total": len(empresas_lista),
            "empresas": empresas_lista
        }
        
    except FileNotFoundError:
        logger.error(f"❌ Arquivo não encontrado: {settings.excel_path}")
        raise HTTPException(
            status_code=404, 
            detail=f"Arquivo {settings.excel_path} não encontrado"
        )
    except Exception as e:
        logger.error(f"❌ Erro ao listar bases: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def executar_alteracao_senha_sync(empresa: str, solicitante: str, ip: str) -> dict:
    """Função sync para executar alteração de senha"""
    from src.automation.password_changer import GerenciadorSenhas
    
    gerenciador = GerenciadorSenhas()
    return gerenciador.alterar_senha_base(
        empresa=empresa,
        solicitante=solicitante,
        ip_solicitante=ip
    )

@router.post("/solicitar-senha", response_model=RespostaSenha)
async def solicitar_senha(
    solicitacao: SolicitacaoSenha,
    request: Request,
    api_key: str = Depends(verificar_api_key)
):
    """Endpoint para solicitar alteração de senha de uma base"""
    
    # Captura o IP
    ip_cliente = obter_ip_cliente(request)
    
    logger.info(f"📨 Solicitação: {solicitacao.empresa} por {solicitacao.solicitante} (IP: {ip_cliente})")
    
    try:
        loop = asyncio.get_event_loop()
        resultado = await loop.run_in_executor(
            executor,
            executar_alteracao_senha_sync,
            solicitacao.empresa,
            solicitacao.solicitante,
            ip_cliente
        )
        
        if resultado['status'] == 'erro':
            logger.error(f"❌ Erro na alteração: {resultado['mensagem']}")
            raise HTTPException(status_code=400, detail=resultado['mensagem'])
        
        # Adiciona IP na resposta
        resultado['ip_solicitante'] = ip_cliente
        
        logger.info(f"✅ Senha alterada com sucesso: {solicitacao.empresa}")
        return resultado
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao processar solicitação: {e}")
        raise HTTPException(status_code=500, detail=f"Erro interno: {str(e)}")

# --- Dashboad Company Routes ---

COMPANIES_FILE = ROOT_DIR / "data" / "companies.json"

def read_companies_data():
    if not os.path.exists(COMPANIES_FILE):
        return []
    with open(COMPANIES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def write_companies_data(data):
    with open(COMPANIES_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

@router.get("/dashboard/companies", response_model=list[Company])
async def get_companies():
    """Retorna a lista de empresas do dashboard"""
    return read_companies_data()

@router.post("/dashboard/companies")
async def save_companies(companies: list[Company], api_key: str = Depends(verificar_api_key)):
    """Salva a lista completa de empresas do dashboard"""
    try:
        # Converter models para dict para salvar no JSON
        data = [c.model_dump() for c in companies]
        write_companies_data(data)
        logger.info(f"💾 Dashboard atualizado: {len(data)} empresas salvas")
        return {"status": "sucesso", "total": len(data)}
    except Exception as e:
        logger.error(f"❌ Erro ao salvar empresas: {e}")
        raise HTTPException(status_code=500, detail=str(e))
