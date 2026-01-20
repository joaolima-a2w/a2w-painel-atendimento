import pandas as pd
from pathlib import Path
from datetime import datetime
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class ExcelHandler:
    """Manipulador de arquivos Excel"""
    
    def __init__(self, file_path: str):
        self.file_path = Path(file_path)
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        
    def ler_bases(self) -> pd.DataFrame:
        """
        Lê o Excel de bases
        
        Colunas esperadas:
        - empresa (str)
        - url (str)
        - usuario (str)
        - senha (str)
        
        Returns:
            DataFrame com as bases
        """
        try:
            df = pd.read_excel(self.file_path)
            
            # Valida colunas obrigatórias
            colunas_obrigatorias = ['empresa', 'url', 'usuario', 'senha']
            if not all(col in df.columns for col in colunas_obrigatorias):
                raise ValueError(f"Excel deve conter as colunas: {colunas_obrigatorias}")
            
            logger.info(f"Lidas {len(df)} bases do arquivo {self.file_path}")
            return df
            
        except Exception as e:
            logger.error(f"Erro ao ler Excel: {e}")
            raise
    
    def ler_base_especifica(self, empresa: str) -> Dict:
        """Retorna dados de uma base específica"""
        df = self.ler_bases()
        base = df[df['empresa'].str.lower() == empresa.lower()]
        
        if base.empty:
            raise ValueError(f"Empresa '{empresa}' não encontrada no Excel")
        
        return base.iloc[0].to_dict()
    
    def atualizar_senha(self, empresa: str, nova_senha: str):
        """Atualiza a senha de uma base no Excel"""
        df = self.ler_bases()
        
        # Atualiza a senha
        df.loc[df['empresa'].str.lower() == empresa.lower(), 'senha'] = nova_senha
        
        # Salva de volta
        df.to_excel(self.file_path, index=False)
        logger.info(f"Senha atualizada para empresa: {empresa}")
    
    def registrar_alteracao(self, empresa: str, usuario: str, senha_antiga: str, nova_senha: str, 
                        solicitante: str, ip_solicitante: str = None):
        """Registra alteração de senha no log COM SENHA ANTIGA"""
        
        registro = {
            'empresa': empresa,
            'usuario': usuario,
            'senha_antiga': senha_antiga,  # ⬅️ NOVA COLUNA
            'senha_nova': nova_senha,
            'solicitante': solicitante,
            'ip_solicitante': ip_solicitante or "Desconhecido",
            'data_hora': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'tipo': 'alteracao',
            'status': 'sucesso'
        }
        
        try:
            if self.log_path.exists():
                df = pd.read_excel(self.log_path)
                df = pd.concat([df, pd.DataFrame([registro])], ignore_index=True)
            else:
                df = pd.DataFrame([registro])
            
            df.to_excel(self.log_path, index=False)
            logger.info(f"✅ Alteração registrada no log: {empresa}")
            
        except Exception as e:
            logger.error(f"Erro ao registrar alteração: {e}")


    def registrar_consulta(self, empresa: str, senha_atual: str, solicitante: str, 
                        solicitante_original: str, ip_solicitante: str = None):
        """Registra quando alguém consulta uma senha já alterada hoje"""
        
        registro = {
            'empresa': empresa,
            'usuario': '-',
            'senha_antiga': '-',
            'senha_nova': senha_atual,
            'solicitante': solicitante,
            'ip_solicitante': ip_solicitante or "Desconhecido",
            'data_hora': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'tipo': 'consulta',
            'status': f'Consultou senha alterada por {solicitante_original}'
        }
        
        try:
            if self.log_path.exists():
                df = pd.read_excel(self.log_path)
                df = pd.concat([df, pd.DataFrame([registro])], ignore_index=True)
            else:
                df = pd.DataFrame([registro])
            
            df.to_excel(self.log_path, index=False)
            logger.info(f"📋 Consulta registrada: {empresa} por {solicitante}")
            
        except Exception as e:
            logger.error(f"Erro ao registrar consulta: {e}")

