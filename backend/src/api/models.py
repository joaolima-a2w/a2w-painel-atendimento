from pydantic import BaseModel, Field
from typing import Optional

class SolicitacaoSenha(BaseModel):
    """Modelo para solicitação de senha"""
    empresa: str = Field(..., description="Nome da empresa/base")
    solicitante: str = Field(..., description="Nome do solicitante")
    
    class Config:
        json_schema_extra = {
            "example": {
                "empresa": "Cliente XYZ",
                "solicitante": "João Silva"
            }
        }

class RespostaSenha(BaseModel):
    """Modelo de resposta da alteração de senha"""
    status: str
    empresa: str
    usuario: Optional[str] = None
    senha: Optional[str] = None
    mensagem: str
    ip_solicitante: Optional[str] = None

class HealthCheck(BaseModel):
    """Health check da API"""
    status: str
    versao: str
    timestamp: str

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
