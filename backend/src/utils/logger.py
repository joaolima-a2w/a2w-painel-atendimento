import logging
from pathlib import Path
from datetime import datetime

def setup_logger(name: str = __name__, log_dir: str = "logs"):
    """Configura o sistema de logs"""
    
    # Cria diretório de logs se não existir
    Path(log_dir).mkdir(exist_ok=True)
    
    # Nome do arquivo de log com data
    log_file = Path(log_dir) / f"app_{datetime.now().strftime('%Y%m%d')}.log"
    
    # Configuração
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s | %(name)s | %(levelname)s | %(message)s',
        handlers=[
            logging.FileHandler(log_file, encoding='utf-8'),
            logging.StreamHandler()  # Também exibe no console
        ]
    )
    
    return logging.getLogger(name)
