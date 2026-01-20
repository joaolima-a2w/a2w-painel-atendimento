"""
API FastAPI para Gerador de Senhas
Integrado com automação Playwright
Versão Corrigida: 2.1.0
"""
from fastapi import FastAPI, HTTPException, Request, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel, Field
from datetime import datetime
from pathlib import Path
from typing import Optional, List
import sys
import json
import asyncio
import logging
import secrets
from concurrent.futures import ThreadPoolExecutor
import pandas as pd
from fastapi import UploadFile, File
from fastapi.staticfiles import StaticFiles
import shutil
from fastapi.responses import HTMLResponse
from datetime import timedelta
import requests


# ========================================
# CONFIGURAÇÃO DE LOGGING
# ========================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# ========================================
# CONFIGURAÇÃO DE CACHE
# ========================================

cache_tokens = {}

# ========================================
# CONFIGURAÇÃO DE PATHS
# ========================================
ROOT_DIR = Path(__file__).parent.parent.parent
sys.path.insert(0, str(ROOT_DIR))

logger.info(f"ROOT_DIR: {ROOT_DIR}")

AVATARS_DIR = ROOT_DIR / "data" / "avatars"
AVATARS_DIR.mkdir(exist_ok=True)

# ========================================
# IMPORTS LOCAIS (APÓS CONFIGURAR PATH)
# ========================================
try:
    from src.utils.queue_manager import fila_global
    from config.settings import settings
    logger.info("Módulos locais importados com sucesso")
except ImportError as e:
    logger.error(f"Erro ao importar módulos locais: {e}")
    raise


# ========================================
# INICIALIZAÇÃO DO GERENCIADOR
# ========================================
AUTOMACAO_DISPONIVEL = False
GerenciadorSenhas = None
gerenciador = None
executor = ThreadPoolExecutor(max_workers=3)

# Controle de concorrência
bases_em_processamento = set()

try:
    from src.automation.password_changer import GerenciadorSenhas
    AUTOMACAO_DISPONIVEL = True
    logger.info("✅ Módulo de automação importado com sucesso")
   
    try:
        gerenciador = GerenciadorSenhas()
        logger.info("Gerenciador de senhas inicializado")
    except Exception as e:
        logger.error(f"Erro ao inicializar gerenciador: {e}", exc_info=True)
        AUTOMACAO_DISPONIVEL = False
        gerenciador = None
       
except Exception as e:
    logger.warning(f"⚠️ Automação não disponível: {e}")
    AUTOMACAO_DISPONIVEL = False
    GerenciadorSenhas = None
    gerenciador = None

logger.info(f"\n{'='*60}")
logger.info(f"Status da inicialização:")
logger.info(f"  AUTOMACAO_DISPONIVEL: {AUTOMACAO_DISPONIVEL}")
logger.info(f"  GerenciadorSenhas: {GerenciadorSenhas}")
logger.info(f"  gerenciador: {gerenciador}")
logger.info(f"{'='*60}\n")


# ========================================
# INICIALIZAR APP
# ========================================
app = FastAPI(
    title="API Gerador de Senhas",
    description="API para geração e gerenciamento de senhas com automação Playwright",
    version="2.1.0"
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Segurança HTTP Basic
security = HTTPBasic()

# Arquivo de dados
DATA_FILE = ROOT_DIR / "data" / "solicitacoes.json"
DATA_FILE.parent.mkdir(exist_ok=True)


# ========================================
# MODELOS
# ========================================
class SolicitacaoSenha(BaseModel):
    cliente: str = Field(..., description="Nome da empresa/base")
    usuario: str = Field(..., description="Usuário do sistema")
    observacao: Optional[str] = Field("", description="Observações adicionais")
    solicitante: str = Field(..., description="Nome do solicitante")
    ip_solicitante: Optional[str] = Field("Desconhecido", description="IP do solicitante")


class Usuario(BaseModel):
    username: str
    password: str


class UsuarioResponse(BaseModel):
    name: str
    username: str
    role: str
    foto: Optional[str] = None

class AppStatus(BaseModel):
    cons: bool = False
    rdv: bool = False
    arm: bool = False
    distr: bool = False

class Contact(BaseModel):
    name: str
    role: str
    dept: str
    phone: Optional[str] = None

class Company(BaseModel):
    name: str
    category: str
    city: str
    state: str
    manager: str
    erp: str
    integration: str
    contacts: list[Contact] = []
    apps: AppStatus
    status: str
    workers: str = ""
    obs: str = ""

# ========================================
# AUTENTICAÇÃO
# ========================================
# ATENÇÃO: Em produção, use banco de dados com senhas hashadas!

import yaml
from yaml.loader import SafeLoader
import bcrypt
from pathlib import Path

# ...

# Caminho para o YAML de usuários
USERS_YAML = ROOT_DIR / "config" / "usuarios.yaml"

def carregar_usuarios_yaml() -> dict:
    """Carrega usuários do arquivo YAML usado pelo Streamlit Authenticator."""
    if not USERS_YAML.exists():
        logger.error(f"Arquivo de usuários não encontrado: {USERS_YAML}")
        return {}

    try:
        with open(USERS_YAML, "r", encoding="utf-8") as f:
            data = yaml.load(f, Loader=SafeLoader) or {}
    except Exception as e:
        logger.error(f"Erro ao ler YAML de usuários: {e}", exc_info=True)
        return {}

    cred = data.get("credentials", {}).get("usernames", {})
    usuarios_db = {}

    for username, info in cred.items():
        usuarios_db[username] = {
            "name": info.get("name", username),
            "username": username,
            "email": info.get("email"),
            "password_hash": info.get("password"),
            "role": info.get("role", "user"),
            "foto": info.get("foto"),  # ← ADICIONE ESTA LINHA
        }

    logger.info(f"Usuários carregados do YAML: {list(usuarios_db.keys())}")
    return usuarios_db

USUARIOS_DB = carregar_usuarios_yaml()

def verificar_credenciais(credentials: HTTPBasicCredentials = Depends(security)) -> dict:
    usuario = USUARIOS_DB.get(credentials.username)
    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário não encontrado",
            headers={"WWW-Authenticate": "Basic"},
        )

    hash_bytes = usuario["password_hash"].encode("utf-8")
    senha_bytes = credentials.password.encode("utf-8")

    if not bcrypt.checkpw(senha_bytes, hash_bytes):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Senha incorreta",
            headers={"WWW-Authenticate": "Basic"},
        )

    return usuario


def verificar_admin(usuario: dict = Depends(verificar_credenciais)) -> dict:
    """Verifica se usuário é admin"""
    if usuario["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Acesso negado. Apenas administradores."
        )
    return usuario


# ========================================
# FUNÇÕES AUXILIARES
# ========================================
def carregar_solicitacoes() -> list:
    """Carrega as solicitações do arquivo JSON"""
    if DATA_FILE.exists():
        try:
            with open(DATA_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Erro ao carregar solicitações: {e}")
            return []
    return []


def salvar_solicitacoes(solicitacoes: list):
    """Salva as solicitações no arquivo JSON"""
    try:
        with open(DATA_FILE, 'w', encoding='utf-8') as f:
            json.dump(solicitacoes, f, ensure_ascii=False, indent=2)
        logger.info(f"Solicitações salvas: {len(solicitacoes)} registros")
    except Exception as e:
        logger.error(f"Erro ao salvar solicitações: {e}")
        raise


def gerar_proximo_id(solicitacoes: list) -> int:
    """Gera próximo ID sequencial (evita duplicatas)"""
    if not solicitacoes:
        return 1
    return max([s.get('id', 0) for s in solicitacoes]) + 1


def validar_cliente_existe(cliente: str) -> dict:
    """Valida se cliente existe no Excel e retorna seus dados"""
    try:
        import pandas as pd
        
        df = pd.read_excel(settings.bases_file)
        
        # Validar colunas necessárias
        required_cols = ['empresa', 'url', 'usuario']
        if not all(col in df.columns for col in required_cols):
            raise HTTPException(
                status_code=500,
                detail=f"Excel inválido. Colunas necessárias: {', '.join(required_cols)}"
            )
        
        # Buscar cliente
        cliente_data = df[df['empresa'].str.lower() == cliente.lower()]
        
        if cliente_data.empty:
            raise HTTPException(
                status_code=404,
                detail=f"Cliente '{cliente}' não encontrado nas bases cadastradas"
            )
        
        return cliente_data.iloc[0].to_dict()
        
    except FileNotFoundError:
        raise HTTPException(
            status_code=500,
            detail=f"Arquivo de bases não encontrado: {settings.bases_file}"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao validar cliente: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao validar cliente: {str(e)}"
        )

def verificar_senha_gerada_hoje(cliente: str, solicitacoes: list) -> dict:
    """
    Verifica se já existe senha gerada hoje para o cliente
    Returns: {'gerada_hoje': bool, 'dados': dict ou None}
    """
    from datetime import date
    
    hoje = date.today().strftime("%Y-%m-%d")

    solicitacoes_cliente = [s for s in solicitacoes if s.get('cliente') == cliente]
   
    for sol in reversed(solicitacoes_cliente):
        data_hora = sol.get('data_hora', '')
        if data_hora.startswith(hoje):
            return {
                'gerada_hoje': True,
                'dados': sol
            }
    
    return {'gerada_hoje': False, 'dados': None}



# ========================================
# ENDPOINTS PÚBLICOS
# ========================================
@app.get("/")
async def root():
    """Endpoint raiz - Informações da API"""
    return {
        "app": "API Gerador de Senhas",
        "versao": "2.1.0",
        "status": "online",
        "automacao_disponivel": AUTOMACAO_DISPONIVEL,
        "endpoints": {
            "login": "POST /login - Autenticação de usuário",
            "bases": "GET /bases - Lista bases cadastradas",
            "solicitar": "POST /solicitar - Solicita nova senha COM AUTOMAÇÃO",
            "listar": "GET /listar - Lista todas solicitações",
            "solicitar-massa": "POST /solicitar-massa - Altera todas as bases (ADMIN)",
            "health": "GET /health - Status da API",
            "docs": "GET /docs - Documentação interativa"
        }
    }


@app.get("/health")
async def health():
    """Health check da API"""
    return {
        "status": "ok",
        "automacao": "disponivel" if AUTOMACAO_DISPONIVEL else "indisponivel",
        "gerenciador": "ok" if gerenciador is not None else "erro",
        "timestamp": datetime.now().isoformat()
    }

@app.post("/login", response_model=UsuarioResponse)
async def login(usuario: Usuario):
    user_data = USUARIOS_DB.get(usuario.username)
    
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos"
        )
    
    if not bcrypt.checkpw(
        usuario.password.encode("utf-8"),
        user_data["password_hash"].encode("utf-8"),
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuário ou senha incorretos"
        )

    logger.info(f"Login bem-sucedido: {usuario.username}")

    return UsuarioResponse(
        name=user_data["name"],
        username=user_data["username"],
        role=user_data["role"],
        foto=user_data.get("foto"),
    )


@app.get("/bases")
async def listar_bases(usuario: dict = Depends(verificar_credenciais)):
    # LOG 1: Ver usuário
    logger.info(f"🔍 USUÁRIO COMPLETO: {usuario}")
    
    try:
        import pandas as pd
        df = pd.read_excel(settings.bases_file)
        eh_admin = usuario['role'] == 'admin'
        logger.info(f"🔍 É admin? {eh_admin}")
        required_cols = ['empresa', 'url', 'usuario']
        if not all(col in df.columns for col in required_cols):
            raise HTTPException(
                status_code=500,
                detail=f"Excel deve ter colunas: {', '.join(required_cols)}"
            )
        
        df = df.dropna(subset=['empresa'])
        
        
        if usuario['role'] == 'admin' and 'senha' in df.columns:
            cols = ['empresa', 'url', 'usuario', 'senha']
        else:
            cols = ['empresa', 'url', 'usuario']
        
        
        cols = [c for c in cols if c in df.columns]
        bases = df[cols].to_dict('records')
        
        logger.info(f"Bases listadas por {usuario['username']} ({usuario['role']}): {len(bases)} registros")
        
        return {
            "status": "success",
            "total": len(bases),
            "bases": bases
        }
        
    except FileNotFoundError:
        raise HTTPException(404, f"Arquivo não encontrado: {settings.bases_file}")
    except Exception as e:
        logger.error(f"Erro ao listar bases: {e}", exc_info=True)
        raise HTTPException(500, f"Erro ao ler bases: {str(e)}")

# ========================================
# ENDPOINTS PROTEGIDOS
# ========================================

# Servir arquivos estáticos (avatars)
app.mount("/avatars", StaticFiles(directory=str(AVATARS_DIR)), name="avatars")

@app.post("/upload/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    usuario: dict = Depends(verificar_credenciais)
):
    """Upload de foto de perfil"""
    try:
        # Validar tipo de arquivo
        if not file.content_type.startswith('image/'):
            raise HTTPException(400, "Arquivo deve ser uma imagem")
        
        # Gerar nome único
        extensao = file.filename.split('.')[-1]
        nome_arquivo = f"{usuario['username']}.{extensao}"
        caminho = AVATARS_DIR / nome_arquivo
        
        # Salvar arquivo
        with open(caminho, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
       
        url_foto = f"/avatars/{nome_arquivo}"
        
        logger.info(f"Avatar enviado: {nome_arquivo} por {usuario['username']}")
        
        return {
            "status": "success",
            "message": "Foto enviada com sucesso",
            "url": url_foto
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro no upload: {e}", exc_info=True)
        raise HTTPException(500, f"Erro ao fazer upload: {str(e)}")

@app.post("/solicitar")
async def solicitar_senha(
    solicitacao: SolicitacaoSenha, 
    request: Request,
    usuario: dict = Depends(verificar_credenciais)
):
    """
    Endpoint para solicitar nova senha COM FILA e VERIFICAÇÃO DIÁRIA
    Requer autenticação
    """
    ip_cliente = request.client.host
    if "x-forwarded-for" in request.headers:
        ip_cliente = request.headers["x-forwarded-for"].split(",")[0].strip()
    
    logger.info(f"📨 Nova solicitação - Cliente: {solicitacao.cliente} | "
                f"Solicitante: {solicitacao.solicitante} ({usuario['username']}) | IP: {ip_cliente}")
    
    try:
        if not AUTOMACAO_DISPONIVEL or gerenciador is None:
            raise HTTPException(503, "Automação não disponível")
        
        cliente_data = validar_cliente_existe(solicitacao.cliente)
        
        solicitacoes = carregar_solicitacoes()
        verificacao = verificar_senha_gerada_hoje(solicitacao.cliente, solicitacoes)
        
        if verificacao['gerada_hoje']:
            dados_existentes = verificacao['dados']
            logger.info(f"Senha de {solicitacao.cliente} já foi gerada hoje. Retornando senha existente.")
            
            nova_consulta = {
                "id": gerar_proximo_id(solicitacoes),
                "cliente": solicitacao.cliente,
                "usuario": dados_existentes['usuario'],
                "senha": dados_existentes['senha'],
                "senha_antiga": dados_existentes.get('senha_antiga'),
                "solicitante": solicitacao.solicitante,
                "usuario_sistema": usuario['username'],
                "ip_solicitante": ip_cliente,
                "data_hora": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "observacao": f"Reutilização da senha gerada em {dados_existentes['data_hora']}",
                "status": "reutilizada",
                "reutilizada": True,
            }
            solicitacoes.append(nova_consulta)
            salvar_solicitacoes(solicitacoes)
            
            return {
                "status": "success",
                "message": f"Senha já foi gerada hoje às {dados_existentes['data_hora']}",
                "id": nova_consulta["id"],
                "senha": dados_existentes['senha'],
                "senha_antiga": dados_existentes.get('senha_antiga'),
                "cliente": solicitacao.cliente,
                "usuario": dados_existentes['usuario'],
                "data_hora": nova_consulta["data_hora"],
                "reutilizada": True,
                "automacao": {
                    "sucesso": True,
                    "mensagem": f"Senha reutilizada (gerada originalmente em {dados_existentes['data_hora']})"
                }
            }

        if solicitacao.cliente in bases_em_processamento:
            raise HTTPException(409, f"A base '{solicitacao.cliente}' já está sendo processada.")
        
        bases_em_processamento.add(solicitacao.cliente)

        
        try:
            logger.info("Adicionando à fila de processamento...")
            
            loop = asyncio.get_event_loop()
      
            resultado = await loop.run_in_executor(
                executor,
                fila_global.adicionar,
                gerenciador.alterar_senha_base,
                solicitacao.cliente,
                solicitacao.solicitante,
                ip_cliente
            )
            
            logger.info(f"Resultado: {resultado['status']}")
            
            if resultado['status'] == 'sucesso':

                foi_reutilizada = 'Senha já alterada hoje' in resultado.get('mensagem', '')
                
                if foi_reutilizada:
                    logger.info(f"Senha já existente do dia retornada: {resultado['empresa']}")
                else:
                    logger.info("Automação concluída com sucesso!")
                
                # Salvar no JSON
                solicitacoes = carregar_solicitacoes()
                nova_solicitacao = {
                    "id": gerar_proximo_id(solicitacoes),
                    "cliente": resultado['empresa'],
                    "usuario": resultado['usuario'],
                    "senha": resultado['senha'],
                    "senha_antiga": resultado.get('senha_antiga'),
                    "solicitante": solicitacao.solicitante,
                    "usuario_sistema": usuario['username'],
                    "ip_solicitante": ip_cliente,
                    "data_hora": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "observacao": solicitacao.observacao,
                    "status": "sucesso",
                    "reutilizada": foi_reutilizada,
                }
                solicitacoes.append(nova_solicitacao)
                salvar_solicitacoes(solicitacoes)
                
                return {
                    "status": "success",
                    "message": resultado['mensagem'],
                    "id": nova_solicitacao["id"],
                    "senha": resultado['senha'],
                    "senha_antiga": resultado.get('senha_antiga'),
                    "cliente": resultado['empresa'],
                    "usuario": resultado['usuario'],
                    "data_hora": nova_solicitacao["data_hora"],
                    "reutilizada": foi_reutilizada,
                    "automacao": {
                        "sucesso": True,
                        "mensagem": resultado['mensagem']
                    }
                }
            else:
                logger.error(f"Automação falhou: {resultado['mensagem']}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Erro na automação: {resultado['mensagem']}"
                )
        
        finally:
            # Sempre remover do processamento
            bases_em_processamento.discard(solicitacao.cliente)
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"ERRO INESPERADO: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar: {str(e)}"
        )


@app.get("/listar")
async def listar_solicitacoes(usuario: dict = Depends(verificar_credenciais)):
    """
    Lista todas as solicitações registradas
    Requer autenticação
    """
    try:
        solicitacoes = carregar_solicitacoes()
        logger.info(f"Solicitações listadas por {usuario['username']}: {len(solicitacoes)} registros")
        
        return {
            "status": "success",
            "total": len(solicitacoes),
            "solicitacoes": solicitacoes
        }
    except Exception as e:
        logger.error(f"Erro ao listar: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao listar: {str(e)}"
        )


@app.get("/solicitacao/{id}")
async def buscar_solicitacao(
    id: int,
    usuario: dict = Depends(verificar_credenciais)
):
    """
    Busca uma solicitação específica por ID
    Requer autenticação
    """
    try:
        solicitacoes = carregar_solicitacoes()
        for sol in solicitacoes:
            if sol["id"] == id:
                return {
                    "status": "success",
                    "solicitacao": sol
                }
        raise HTTPException(
            status_code=404,
            detail="Solicitação não encontrada"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao buscar solicitação: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao buscar: {str(e)}"
        )


@app.delete("/limpar")
async def limpar_solicitacoes(admin: dict = Depends(verificar_admin)):
    """
    Limpa todas as solicitações (APENAS ADMIN)
    Requer autenticação de administrador
    """
    try:
        # Fazer backup antes de limpar
        if DATA_FILE.exists():
            backup_file = DATA_FILE.parent / f"solicitacoes_backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
            
            # Copiar arquivo
            import shutil
            shutil.copy2(DATA_FILE, backup_file)
            logger.info(f"Backup criado: {backup_file}")
        
        # Criar arquivo vazio
        salvar_solicitacoes([])
        
        logger.warning(f"Solicitações limpas por {admin['username']}")
        
        return {
            "status": "success",
            "message": "Todas as solicitações foram removidas (backup criado)",
            "backup": str(backup_file) if DATA_FILE.exists() else None
        }
    except Exception as e:
        logger.error(f"Erro ao limpar: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao limpar: {str(e)}"
        )


@app.post("/solicitar-massa")
async def solicitar_massa(
    request: Request,
    admin: dict = Depends(verificar_admin)
):
    """
    Altera a senha de TODAS as bases cadastradas no Excel
    ATENÇÃO: Esta operação pode demorar bastante tempo!
    APENAS ADMIN
    """
    
    # Capturar IP
    ip_cliente = request.client.host
    if "x-forwarded-for" in request.headers:
        ip_cliente = request.headers["x-forwarded-for"].split(",")[0].strip()
    
    logger.warning(f"ALTERAÇÃO EM MASSA iniciada por {admin['username']} ({ip_cliente})")
    
    try:
        # Verificar se automação está disponível
        if not AUTOMACAO_DISPONIVEL or gerenciador is None:
            raise HTTPException(
                status_code=503,
                detail="Automação não disponível"
            )
        
        logger.info("Iniciando alteração em massa de TODAS as bases...")
        
        # Executar em thread separada
        loop = asyncio.get_event_loop()
        resultados = await loop.run_in_executor(
            executor,
            gerenciador.alterar_todas_senhas
        )
        
        # Contar sucessos e erros
        sucesso = sum(1 for r in resultados if r['status'] == 'sucesso')
        erro = len(resultados) - sucesso
        
        logger.info(f"Alteração em massa concluída: {sucesso} sucessos, {erro} erros")
        
        return {
            "status": "success",
            "message": f"Processamento concluído: {sucesso} sucessos, {erro} erros",
            "total": len(resultados),
            "sucesso": sucesso,
            "erro": erro,
            "resultados": resultados,
            "executado_por": admin['username']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ ERRO na alteração em massa: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar alteração em massa: {str(e)}"
        )

# ========================================
# ENDPOINTS DE AGENDAMENTO
# ========================================

AGENDAMENTOS_FILE = ROOT_DIR / "data" / "agendamentos.json"

def carregar_agendamentos() -> list:
    """Carrega agendamentos do JSON"""
    if AGENDAMENTOS_FILE.exists():
        try:
            with open(AGENDAMENTOS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Erro ao carregar agendamentos: {e}")
            return []
    return []

def salvar_agendamentos(agendamentos: list):
    """Salva agendamentos no JSON"""
    try:
        AGENDAMENTOS_FILE.parent.mkdir(exist_ok=True)
        with open(AGENDAMENTOS_FILE, 'w', encoding='utf-8') as f:
            json.dump(agendamentos, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Erro ao salvar agendamentos: {e}")
        raise

@app.get("/agendamentos")
async def listar_agendamentos(usuario: dict = Depends(verificar_credenciais)):
    """Lista todos os agendamentos"""
    try:
        agendamentos = carregar_agendamentos()
        
        if usuario['role'] != 'admin':
            agendamentos = [a for a in agendamentos if a.get('criado_por') == usuario['username']]
        
        return {
            "status": "success",
            "total": len(agendamentos),
            "agendamentos": agendamentos
        }
    except Exception as e:
        logger.error(f"Erro ao listar agendamentos: {e}", exc_info=True)
        raise HTTPException(500, f"Erro: {str(e)}")

        
@app.post("/agendamentos")
async def criar_agendamento(
    dados: dict,
    usuario: dict = Depends(verificar_credenciais)
):
    """
    Cria novo agendamento
    tipos: 'execucao_massa', 'reversao'
    recorrencia: 'unico', 'diario', 'semanal', 'mensal'
    """
    try:
        agendamentos = carregar_agendamentos()
        
        novo_agendamento = {
            "id": gerar_proximo_id(agendamentos),
            "tipo": dados.get("tipo"),  # 'execucao_massa' ou 'reversao'
            "nome": dados.get("nome", "Agendamento"),
            "data_hora": dados.get("data_hora"),  # "2026-01-15 19:00"
            "recorrencia": dados.get("recorrencia", "unico"),  # 'unico', 'diario', 'semanal'
            "ativo": True,
            "criado_por": usuario['username'],
            "criado_em": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "ultima_execucao": None,
            "proxima_execucao": dados.get("data_hora"),
        }
        
        agendamentos.append(novo_agendamento)
        salvar_agendamentos(agendamentos)
        
        logger.info(f"Agendamento criado: {novo_agendamento['nome']} por {usuario['username']}")
        
        return {
            "status": "success",
            "message": "Agendamento criado com sucesso",
            "agendamento": novo_agendamento
        }
        
    except Exception as e:
        logger.error(f"Erro ao criar agendamento: {e}", exc_info=True)
        raise HTTPException(500, f"Erro: {str(e)}")

@app.put("/agendamentos/{id}")
async def atualizar_agendamento(
    id: int,
    dados: dict,
    admin: dict = Depends(verificar_admin)
):
    """Atualiza agendamento (apenas admin)"""
    try:
        agendamentos = carregar_agendamentos()
        
        for ag in agendamentos:
            if ag['id'] == id:
                ag.update(dados)
                ag['modificado_por'] = admin['username']
                ag['modificado_em'] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                break
        else:
            raise HTTPException(404, "Agendamento não encontrado")
        
        salvar_agendamentos(agendamentos)
        
        return {"status": "success", "message": "Agendamento atualizado"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao atualizar agendamento: {e}", exc_info=True)
        raise HTTPException(500, f"Erro: {str(e)}")

@app.delete("/agendamentos/{id}")
async def deletar_agendamento(
    id: int,
    admin: dict = Depends(verificar_admin)
):
    """Deleta agendamento (apenas admin)"""
    try:
        agendamentos = carregar_agendamentos()
        agendamentos_novos = [a for a in agendamentos if a['id'] != id]
        
        if len(agendamentos) == len(agendamentos_novos):
            raise HTTPException(404, "Agendamento não encontrado")
        
        salvar_agendamentos(agendamentos_novos)
        
        logger.warning(f"Agendamento {id} deletado por {admin['username']}")
        
        return {"status": "success", "message": "Agendamento deletado"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao deletar agendamento: {e}", exc_info=True)
        raise HTTPException(500, f"Erro: {str(e)}")

@app.post("/agendamentos/{id}/toggle")
async def toggle_agendamento(
    id: int,
    admin: dict = Depends(verificar_admin)
):
    """Ativa/desativa agendamento"""
    try:
        agendamentos = carregar_agendamentos()
        
        for ag in agendamentos:
            if ag['id'] == id:
                ag['ativo'] = not ag.get('ativo', True)
                break
        else:
            raise HTTPException(404, "Agendamento não encontrado")
        
        salvar_agendamentos(agendamentos)
        
        return {
            "status": "success",
            "message": f"Agendamento {'ativado' if ag['ativo'] else 'desativado'}",
            "ativo": ag['ativo']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao toggle agendamento: {e}", exc_info=True)
        raise HTTPException(500, f"Erro: {str(e)}")


# ========================================
# ENDPOINTS DE REVERSÃO DE SENHAS
# ========================================
@app.get("/reversao/config")
async def get_config_reversao(admin: dict = Depends(verificar_admin)):
    """Retorna configuração da reversão (APENAS ADMIN)"""
    return {
        "ativa": settings.reversao_ativa,
        "horario": settings.reversao_horario,
    }


@app.put("/reversao/config")
async def atualizar_config_reversao(
    dados: dict,
    admin: dict = Depends(verificar_admin)
):
    """Atualiza configuração da reversão (APENAS ADMIN)"""
    global settings
    
    if 'ativa' in dados:
        settings.reversao_ativa = dados['ativa']
        logger.warning(f"Reversão automática {'ATIVADA' if dados['ativa'] else 'DESATIVADA'} por {admin['username']}")
    
    if 'horario' in dados:
        settings.reversao_horario = dados['horario']
        logger.info(f"Horário de reversão alterado para {dados['horario']} por {admin['username']}")
    
    return {
        "status": "success",
        "message": "Configuração atualizada",
        "config": {
            "ativa": settings.reversao_ativa,
            "horario": settings.reversao_horario,
        }
    }

@app.get("/reversao/pendentes")
async def listar_reversoes_pendentes(usuario: dict = Depends(verificar_credenciais)):
    """
    Lista senhas alteradas hoje que serão revertidas às 19h
    """
    try:
        from datetime import date
        
        solicitacoes = carregar_solicitacoes()
        hoje = date.today().strftime("%Y-%m-%d")
        
        # Filtrar solicitações de hoje que não foram reutilizadas
        pendentes = []
        for sol in solicitacoes:
            data_hora = sol.get('data_hora', '')
            if data_hora.startswith(hoje) and not sol.get('reutilizada', False):
                pendentes.append({
                    "id": sol['id'],
                    "cliente": sol['cliente'],
                    "usuario": sol['usuario'],
                    "senha_nova": sol['senha'],
                    "senha_antiga": sol.get('senha_antiga'),
                    "data_hora": sol['data_hora'],
                    "solicitante": sol['solicitante'],
                })
        
        logger.info(f"Reversões pendentes para hoje: {len(pendentes)}")
        
        return {
            "status": "success",
            "total": len(pendentes),
            "pendentes": pendentes,
            "horario_reversao": "19:00"
        }
        
    except Exception as e:
        logger.error(f"Erro ao listar reversões pendentes: {e}", exc_info=True)
        raise HTTPException(500, f"Erro: {str(e)}")


@app.post("/reversao/executar")
async def executar_reversao_manual(admin: dict = Depends(verificar_admin)):
    """
    Executa reversão manual de todas as senhas do dia (APENAS ADMIN)
    """
    try:
        logger.warning(f"Reversão manual iniciada por {admin['username']}")
        
        from scripts.reverter_senhas_19h import reverter_senhas_do_dia
        
        loop = asyncio.get_event_loop()
        resultados = await loop.run_in_executor(
            executor,
            reverter_senhas_do_dia
        )
        
        sucesso = sum(1 for r in resultados if r.get('status') == 'sucesso')
        erro = len(resultados) - sucesso
        
        logger.info(f"Reversão manual concluída: {sucesso} sucessos, {erro} erros")
        
        return {
            "status": "success",
            "message": f"Reversão concluída: {sucesso} sucessos, {erro} erros",
            "total": len(resultados),
            "sucesso": sucesso,
            "erro": erro,
            "resultados": resultados,
            "executado_por": admin['username'],
            "data_hora": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
        
    except Exception as e:
        logger.error(f"Erro na reversão manual: {e}", exc_info=True)
        raise HTTPException(500, f"Erro: {str(e)}")


@app.get("/reversao/historico")
async def historico_reversoes(usuario: dict = Depends(verificar_credenciais)):
    """
    Lista histórico de reversões executadas (lê do JSON)
    """
    try:
        solicitacoes = carregar_solicitacoes()
        
        # Filtrar apenas solicitações com status "revertida"
        reversoes = [
            sol for sol in solicitacoes 
            if sol.get('status') == 'revertida'
        ]
        
        logger.info(f"Reversões no histórico: {len(reversoes)}")
        
        return {
            "status": "success",
            "total": len(reversoes),
            "reversoes": reversoes
        }
            
    except Exception as e:
        logger.error(f"Erro ao buscar histórico: {e}", exc_info=True)
        raise HTTPException(500, f"Erro: {str(e)}")

# ========================================
# ENDPOINTS DE GERENCIAMENTO DE USUÁRIOS
# ========================================

@app.get("/usuarios")
async def listar_usuarios(usuario: dict = Depends(verificar_credenciais)):
    """
    Lista usuários
    - Admin: vê todos
    - User: vê só ele mesmo
    """
    if usuario['role'] == 'admin':
        # Admin vê todos (sem senha)
        usuarios = []
        for username, data in USUARIOS_DB.items():
            usuarios.append({
                "username": username,
                "name": data["name"],
                "email": data.get("email"),
                "role": data["role"],
                "foto": data.get("foto"),
            })
        return {"usuarios": usuarios}
    else:
        # User vê só ele mesmo
        return {"usuarios": [{
            "username": usuario["username"],
            "name": usuario["name"],
            "email": usuario.get("email"),
            "role": usuario["role"],
            "foto": usuario.get("foto"),
        }]}


@app.put("/usuarios/{username}")
async def atualizar_usuario(
    username: str,
    dados: dict,
    usuario_logado: dict = Depends(verificar_credenciais)
):
    global USUARIOS_DB
    """
    Atualiza dados do usuário
    - User: só pode editar a si mesmo
    - Admin: pode editar qualquer um
    """
    # Verificar permissão
    if usuario_logado['role'] != 'admin' and usuario_logado['username'] != username:
        raise HTTPException(403, "Você só pode editar seu próprio perfil")
    
    if username not in USUARIOS_DB:
        raise HTTPException(404, "Usuário não encontrado")
    
    # Atualizar no YAML
    try:
        with open(USERS_YAML, "r", encoding="utf-8") as f:
            data = yaml.load(f, Loader=SafeLoader) or {}
        
        user_data = data["credentials"]["usernames"][username]
        
        # Atualizar campos
        if "name" in dados:
            user_data["name"] = dados["name"]
        if "email" in dados:
            user_data["email"] = dados["email"]
        if "foto" in dados:
            user_data["foto"] = dados["foto"]
        if "role" in dados and usuario_logado['role'] == 'admin':
            user_data["role"] = dados["role"]
        
        # Se tiver nova senha, gerar hash
        if "nova_senha" in dados and dados["nova_senha"]:
            nova_senha_hash = bcrypt.hashpw(
                dados["nova_senha"].encode('utf-8'),
                bcrypt.gensalt()
            ).decode('utf-8')
            user_data["password"] = nova_senha_hash
        
        # Salvar YAML
        with open(USERS_YAML, "w", encoding="utf-8") as f:
            yaml.dump(data, f, allow_unicode=True, default_flow_style=False)
        
        # Recarregar USUARIOS_DB
        
        USUARIOS_DB = carregar_usuarios_yaml()
        
        logger.info(f"Usuário {username} atualizado por {usuario_logado['username']}")
        
        return {"message": "Usuário atualizado com sucesso"}
        
    except Exception as e:
        logger.error(f"Erro ao atualizar usuário: {e}", exc_info=True)
        raise HTTPException(500, f"Erro ao atualizar: {str(e)}")

@app.post("/usuarios")
async def criar_usuario(
    dados: dict,
    admin: dict = Depends(verificar_admin)
):
    global USUARIOS_DB
    """
    Cria novo usuário (apenas admin)
    """
    username = dados.get("username")
    if not username:
        raise HTTPException(400, "Username é obrigatório")
    
    if username in USUARIOS_DB:
        raise HTTPException(409, "Usuário já existe")
    
    try:
        with open(USERS_YAML, "r", encoding="utf-8") as f:
            data = yaml.load(f, Loader=SafeLoader) or {}
        
        
        senha_hash = bcrypt.hashpw(
            dados.get("senha", "senha123").encode('utf-8'),
            bcrypt.gensalt()
        ).decode('utf-8')
        
        # Adicionar usuário
        data["credentials"]["usernames"][username] = {
            "name": dados.get("name", username),
            "email": dados.get("email", ""),
            "password": senha_hash,
            "role": dados.get("role", "user"),
            "foto": dados.get("foto", ""),
        }
        
        # Salvar
        with open(USERS_YAML, "w", encoding="utf-8") as f:
            yaml.dump(data, f, allow_unicode=True, default_flow_style=False)
        
        # Recarregar
        
        USUARIOS_DB = carregar_usuarios_yaml()
        
        logger.info(f"Usuário {username} criado por {admin['username']}")
        
        return {"message": f"Usuário {username} criado com sucesso"}
        
    except Exception as e:
        logger.error(f"Erro ao criar usuário: {e}", exc_info=True)
        raise HTTPException(500, f"Erro ao criar: {str(e)}")


@app.delete("/usuarios/{username}")
async def deletar_usuario(
    username: str,
    admin: dict = Depends(verificar_admin)
):
    global USUARIOS_DB
    """
    Deleta usuário (apenas admin)
    Não pode deletar a si mesmo
    """
    if username == admin['username']:
        raise HTTPException(400, "Você não pode deletar sua própria conta")
    
    if username not in USUARIOS_DB:
        raise HTTPException(404, "Usuário não encontrado")
    
    try:
        with open(USERS_YAML, "r", encoding="utf-8") as f:
            data = yaml.load(f, Loader=SafeLoader) or {}
        
        del data["credentials"]["usernames"][username]
        
        with open(USERS_YAML, "w", encoding="utf-8") as f:
            yaml.dump(data, f, allow_unicode=True, default_flow_style=False)
        
        
        USUARIOS_DB = carregar_usuarios_yaml()
        
        logger.warning(f"Usuário {username} deletado por {admin['username']}")
        
        return {"message": f"Usuário {username} deletado"}
        
    except Exception as e:
        logger.error(f"Erro ao deletar usuário: {e}", exc_info=True)
        raise HTTPException(500, f"Erro ao deletar: {str(e)}")


# ========================================
# ACESSO RÁPIDO
# ========================================
LOGS_DIR = ROOT_DIR / "data" / "logs_atividades"
LOGS_DIR.mkdir(exist_ok=True)

@app.post("/logs/atividade")
async def salvar_log_atividade(dados: dict):
    """
    Recebe logs de atividade do agente desktop
    """
    try:
        empresa = dados.get('empresa', 'desconhecido')
        timestamp = datetime.now().strftime('%Y%m%d')
        
        # Arquivo de log do dia
        log_file = LOGS_DIR / f"{empresa}_{timestamp}.jsonl"
        
        # Adicionar entrada ao arquivo (JSONL - uma linha por evento)
        with open(log_file, 'a', encoding='utf-8') as f:
            f.write(json.dumps(dados, ensure_ascii=False) + '\n')
        
        return {"status": "success", "message": "Log salvo"}
        
    except Exception as e:
        logger.error(f"Erro ao salvar log: {e}")
        raise HTTPException(500, f"Erro: {str(e)}")

@app.get("/logs/atividades/{empresa}")
async def listar_logs_empresa(
    empresa: str,
    admin: dict = Depends(verificar_admin)
):
    """
    Lista logs de atividades de uma empresa (apenas admin)
    """
    try:
        logs = []
        
        # Buscar todos os arquivos da empresa
        for log_file in LOGS_DIR.glob(f"{empresa}_*.jsonl"):
            with open(log_file, 'r', encoding='utf-8') as f:
                for line in f:
                    if line.strip():
                        logs.append(json.loads(line))
        
        return {
            "status": "success",
            "total": len(logs),
            "logs": sorted(logs, key=lambda x: x.get('timestamp', ''), reverse=True)
        }
        
    except Exception as e:
        logger.error(f"Erro ao listar logs: {e}")
        raise HTTPException(500, f"Erro: {str(e)}")


@app.post("/acesso-a2w")
async def acesso_a2w(
    dados: dict,
    usuario: dict = Depends(verificar_credenciais)
):
    try:
        empresa = dados.get('empresa')
        base_data = validar_cliente_existe(empresa)
        
        # LOG: Ver credenciais que estão sendo usadas
        logger.info(f"🔍 Tentando login para {empresa}")
        logger.info(f"🔍 Usuário: {base_data['usuario']}")
        logger.info(f"🔍 URL: {base_data['url']}")
        # NÃO LOGAR A SENHA em produção
        
        url_login = "https://api.a2wplataforma.com.br:7082/api/v1/user/login"
        
        headers = {
            "Content-Type": "application/json",
            "x-tenant-guid": "afe8278f-0a6e-4944-a723-08dae73f84a7",
            "Accept": "application/json"
        }
        
        payload = {
            "username": base_data['usuario'],
            "password": base_data['senha'],
            "local": "web",
            "app": "web"
        }
        
        logger.info(f"Enviando requisição para API A2W...")
        
        response = requests.post(
            url_login, 
            json=payload, 
            headers=headers, 
            verify=False,  # Ignora SSL (só para dev)
            timeout=10
        )
        
        logger.info(f"Resposta da API: {response.status_code}")
        logger.info(f"Body: {response.text[:200]}")  # Primeiros 200 chars
        
        if response.status_code == 200:
            resultado = response.json()
            token = resultado.get('accessToken') or resultado.get('token') or resultado.get('data', {}).get('accessToken')
            
            if not token:
                logger.error(f"Token não encontrado na resposta: {resultado}")
                raise HTTPException(500, "Token de acesso não retornado pela API")
            
            logger.info(f"Login A2W bem-sucedido: {empresa}")
            
            # Registrar no histórico
            solicitacoes = carregar_solicitacoes()
            novo_acesso = {
                "id": gerar_proximo_id(solicitacoes),
                "cliente": empresa,
                "usuario": base_data['usuario'],
                "senha": base_data['senha'],
                "solicitante": usuario['username'],
                "usuario_sistema": usuario['username'],
                "ip_solicitante": dados.get('ip', 'web'),
                "data_hora": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "observacao": "Acesso automático via API A2W",
                "status": "acesso",
                "tipo": "acesso_a2w"
            }
            solicitacoes.append(novo_acesso)
            salvar_solicitacoes(solicitacoes)
            
            # Dentro do if response.status_code == 200:
            token_temporario = secrets.token_urlsafe(32)
            cache_tokens[token_temporario] = {
                'token_jwt': token,
                'url': base_data['url'],
                'expira': datetime.now() + timedelta(minutes=5)
            }

            url_autenticada = f"http://192.168.0.190:8000/acesso-autenticado-a2w/{token_temporario}"

            return {
                "status": "success",
                "message": "Login realizado com sucesso",
                "url_autenticada": url_autenticada,
                "token": token,
                "empresa": empresa,
            }

        else:
            logger.error(f"Erro no login A2W: {response.status_code}")
            logger.error(f"Resposta: {response.text}")
            raise HTTPException(401, f"Credenciais inválidas ou erro na API A2W")
            
    except HTTPException:
        raise
    except requests.exceptions.RequestException as e:
        logger.error(f"Erro de conexão: {e}")
        raise HTTPException(503, "Erro ao conectar com API da A2W")
    except Exception as e:
        logger.error(f"Erro geral: {e}", exc_info=True)
        raise HTTPException(500, f"Erro: {str(e)}")

@app.get("/acesso-autenticado-a2w/{token_acesso}", response_class=HTMLResponse)
async def acesso_autenticado_a2w(token_acesso: str):
    """
    Página que injeta token da A2W no localStorage antes de redirecionar
    """
    if token_acesso not in cache_tokens:
        return HTMLResponse("<h1>Token inválido</h1>", status_code=404)
    
    dados = cache_tokens[token_acesso]
    token_jwt = dados.get('token_jwt')  # Token da A2W
    url_sistema = dados.get('url')
    
    del cache_tokens[token_acesso]  # Usar apenas uma vez
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Acessando Sistema</title>
        <style>
            body {{
                font-family: Arial;
                background: linear-gradient(135deg, #0f9b4c 0%, #065f46 100%);
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
            }}
            .spinner {{
                border: 4px solid rgba(255,255,255,0.3);
                border-top: 4px solid white;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
            }}
            @keyframes spin {{
                0% {{ transform: rotate(0deg); }}
                100% {{ transform: rotate(360deg); }}
            }}
        </style>
    </head>
    <body>
        <div style="text-align: center;">
            <h1>🚀 Acessando Sistema</h1>
            <div class="spinner"></div>
            <p>Autenticando...</p>
        </div>
        
        <script>
            // Salvar token no localStorage
            localStorage.setItem('accessToken', '{token_jwt}');
            localStorage.setItem('token', '{token_jwt}');
            localStorage.setItem('user_authenticated', 'true');
            
            // Redirecionar após 1 segundo
            setTimeout(() => {{
                window.location.href = '{url_sistema}';
            }}, 1000);
        </script>
    </body>
    </html>
    """
    
    return HTMLResponse(html)


@app.post("/acesso-rapido")
async def acesso_rapido(
    dados: dict, 
    usuario: dict = Depends(verificar_credenciais)
):
    """
    Gera link de acesso rápido ao sistema do cliente
    """
    try:
        empresa = dados.get('empresa')
        base_data = validar_cliente_existe(empresa)

        token = secrets.token_urlsafe(32)

        cache_tokens[token] = {
            'empresa': empresa,
            'url': base_data['url'],
            'usuario': base_data['usuario'],
            'senha': base_data['senha'],
            'expira': datetime.now() + timedelta(minutes=5),
            'solicitante': usuario['username']
        }
        
        logger.info(f"Link de acesso gerado para {empresa} por {usuario['username']}")

        solicitacoes = carregar_solicitacoes()
        novo_acesso = {
            "id": gerar_proximo_id(solicitacoes),
            "cliente": empresa,
            "usuario": base_data['usuario'],
            "senha": base_data['senha'],
            "solicitante": usuario['username'],
            "usuario_sistema": usuario['username'],
            "ip_solicitante": dados.get('ip', 'web'),
            "data_hora": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "observacao": "Acesso rápido ao sistema",
            "status": "acesso",
            "tipo": "acesso_rapido"
        }
        solicitacoes.append(novo_acesso)
        salvar_solicitacoes(solicitacoes)
        
        return {
            "status": "success",
            "message": "Link de acesso gerado",
            "url_acesso": f"http://192.168.0.190:8000/auto-login/{token}",
            "url_sistema": base_data['url'],
            "usuario": base_data['usuario'],
            "senha": base_data['senha'],
            "expira_em": "5 minutos"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Erro ao gerar acesso: {e}", exc_info=True)
        raise HTTPException(500, f"Erro: {str(e)}")

@app.get("/auto-login/{token}", response_class=HTMLResponse)
async def auto_login(token: str):
    """Página de acesso rápido com credenciais"""
    if token not in cache_tokens:
        return HTMLResponse("""
            <html>
            <head><title>Link Expirado</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px; background: #fee2e2;">
                <h1>Link Expirado</h1>
                <p>Este link de acesso já expirou ou é inválido.</p>
            </body>
            </html>
        """, status_code=404)
    
    creds = cache_tokens[token]
    
    if datetime.now() > creds['expira']:
        del cache_tokens[token]
        return HTMLResponse("""
            <html>
            <head><title>Link Expirado</title></head>
            <body style="font-family: Arial; text-align: center; padding: 50px; background: #fef3c7;">
                <h1>Link Expirado</h1>
                <p>Este link expirou após 5 minutos.</p>
            </body>
            </html>
        """, status_code=410)
    
    del cache_tokens[token]
    
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <title>Acessando {creds['empresa']}</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                background: linear-gradient(135deg, #0f9b4c 0%, #065f46 100%);
                color: white;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
            }}
            .spinner {{
                border: 4px solid rgba(255,255,255,0.3);
                border-top: 4px solid white;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
            }}
            @keyframes spin {{
                0% {{ transform: rotate(0deg); }}
                100% {{ transform: rotate(360deg); }}
            }}
        </style>
    </head>
    <body>
        <div style="text-align: center;">
            <h1>Acessando {creds['empresa']}</h1>
            <div class="spinner"></div>
            <p>Autenticando automaticamente...</p>
        </div>
        
        <script>
            // Salvar token no localStorage
            localStorage.setItem('accessToken', '{token_jwt}');
            localStorage.setItem('user', JSON.stringify({{
                username: '{creds['usuario']}',
                authenticated: true
            }}));
            
            // Redirecionar após 1 segundo
            setTimeout(() => {{
                window.location.href = '{creds['url']}';
            }}, 1000);
        </script>
    </body>
    </html>
    """
    
    return HTMLResponse(html)

# ========================================
# ENDPOINTS DASHBOARD (COMPANIES)
# ========================================

COMPANIES_FILE = ROOT_DIR / "data" / "companies.json"

def carregar_dados_dashboard():
    if not COMPANIES_FILE.exists():
        return []
    try:
        with open(COMPANIES_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Erro ao carregar dashboard: {e}")
        return []

def salvar_dados_dashboard(data):
    try:
        COMPANIES_FILE.parent.mkdir(exist_ok=True)
        with open(COMPANIES_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
        return True
    except Exception as e:
        logger.error(f"Erro ao salvar dashboard: {e}")
        return False

@app.get("/dashboard/companies", response_model=List[Company])
async def get_dashboard_companies(usuario: dict = Depends(verificar_credenciais)):
    """Retorna a lista de empresas do dashboard"""
    return carregar_dados_dashboard()

@app.post("/dashboard/companies")
async def post_dashboard_companies(companies: List[Company], usuario: dict = Depends(verificar_credenciais)):
    """Salva a lista completa de empresas do dashboard"""
    # Só admin pode salvar se quisermos restringir, mas o usuário pediu que "quem subir" afete a todos.
    # Vou permitir qualquer usuário autenticado por enquanto, ou restringir a admin se preferir.
    
    data = [c.model_dump() for c in companies]
    if salvar_dados_dashboard(data):
        logger.info(f"Dashboard atualizado por {usuario['username']}: {len(data)} empresas")
        return {"status": "success", "total": len(data)}
    else:
        raise HTTPException(500, "Erro ao salvar dados do dashboard")



# ========================================
# EVENTOS DE INICIALIZAÇÃO/DESLIGAMENTO
# ========================================
@app.on_event("startup")
async def startup_event():
    """Evento executado ao iniciar a API"""
    logger.info("API iniciada com sucesso!")
    logger.info(f"Diretório de dados: {DATA_FILE.parent}")
    logger.info(f"Automação: {'Disponível' if AUTOMACAO_DISPONIVEL else 'Indisponível'}")


@app.on_event("shutdown")
async def shutdown_event():
    """Evento executado ao desligar a API"""
    logger.info("🛑 Encerrando API...")
    executor.shutdown(wait=True)
    logger.info("✅ API encerrada")


# ========================================
# INICIALIZAÇÃO (para rodar diretamente)
# ========================================
if __name__ == "__main__":
    import uvicorn
    
    logger.info("Iniciando servidor em modo desenvolvimento...")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )

