"""
Configurações do sistema
"""
from pathlib import Path
from pydantic_settings import BaseSettings
from typing import Optional
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    """Configurações da aplicação"""
    

    ROOT_DIR: Path = Path(__file__).parent.parent
    DATA_DIR: Path = ROOT_DIR / "data"

    # Reversão
    reversao_ativa: bool = True  # ← NOVO: Flag de ativo/desativado
    reversao_horario: str = "19:00"  # ← NOVO: Horário configurável
    senhas_geradas_path: Path = DATA_DIR / "senhas_geradas.xlsx"

    bases_file: Path = ROOT_DIR / "data" / "bases.xlsx"
    bases_file: Path = ROOT_DIR / "data" / "bases.xlsx"
    secret_key: str = "sua-chave-secreta-aqui-troque-em-producao"

    password_length: int = 12
    password_complexity: str = "high"
    password_use_uppercase: bool = True
    password_use_lowercase: bool = True
    password_use_digits: bool = True
    password_use_symbols: bool = True
    
    # Configurações do Navegador (Playwright)
    headless: bool = False  # False = mostra navegador, True = invisível
    browser_type: str = "chromium"  # chromium, firefox, webkit
    slow_mo: int = 500  # Delay entre ações (ms)
    timeout: int = 30000  # Timeout padrão (30 segundos)
    
    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    
    # Segurança
    api_secret_key: str = "sua-chave-secreta-aqui-troque-em-producao"
    
    # Automação
    headless: bool = False  # True para rodar sem interface gráfica
    timeout: int = 30000  # 30 segundos
    
    # Logging
    log_level: str = "INFO"
    
    class Config:
        env_file = ".env"
        case_sensitive = False


# Instância global
settings = Settings()
