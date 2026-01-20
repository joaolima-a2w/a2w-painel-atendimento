from src.automation.browser_automation import AutomacaoSistema
from src.utils.password_generator import PasswordGenerator
from src.utils.excel_handler import ExcelHandler
from src.utils.logger import setup_logger
from config.settings import settings
import time
from datetime import datetime, date
import pandas as pd

logger = setup_logger(__name__)

class GerenciadorSenhas:
    """Orquestra a alteração de senhas"""
    
    def __init__(self):
        self.excel_handler = ExcelHandler(settings.bases_file)
        self.password_generator = PasswordGenerator(
            length=settings.password_length,
            complexity=settings.password_complexity
        )
    
    def verificar_alteracao_hoje(self, empresa: str) -> dict:
        """
        Verifica se a empresa já teve senha alterada hoje
        
        Returns:
            dict com 'alterada_hoje' (bool) e 'dados' (dict com info da última alteração)
        """
        try:
            df_log = pd.read_excel(settings.senhas_geradas_path)
            
            # Filtrar por empresa
            df_empresa = df_log[df_log['empresa'] == empresa]
            
            if df_empresa.empty:
                return {"alterada_hoje": False, "dados": None}

            ultima = df_empresa.iloc[-1]

            data_alteracao = pd.to_datetime(ultima['data_hora']).date()
            hoje = date.today()
            
            if data_alteracao == hoje:
                return {
                    "alterada_hoje": True,
                    "dados": {
                        "senha": ultima['senha_nova'],
                        "usuario": ultima['usuario'],
                        "data_hora": ultima['data_hora'],
                        "solicitante_original": ultima['solicitante']
                    }
                }
            
            return {"alterada_hoje": False, "dados": None}
            
        except FileNotFoundError:
            return {"alterada_hoje": False, "dados": None}
        except Exception as e:
            logger.error(f"Erro ao verificar alteração: {e}")
            return {"alterada_hoje": False, "dados": None}
        
    def alterar_senha_base(self, empresa: str, solicitante: str = "Sistema", ip_solicitante: str = None) -> dict:
        """
        Altera a senha de uma base específica
        COM VERIFICAÇÃO SE JÁ FOI ALTERADA HOJE
        """
        logger.info(f"Iniciando processo para: {empresa} (Solicitante: {solicitante}, IP: {ip_solicitante})")
        
        try:

            verificacao = self.verificar_alteracao_hoje(empresa)
            
            if verificacao['alterada_hoje']:
                dados = verificacao['dados']
                logger.info(f"Senha já foi alterada hoje para {empresa}. Retornando senha existente.")
                
                self.excel_handler.registrar_consulta(
                    empresa=empresa,
                    senha_atual=dados['senha'],
                    solicitante=solicitante,
                    solicitante_original=dados['solicitante_original'],
                    ip_solicitante=ip_solicitante
                )
                
                return {
                    "status": "sucesso",
                    "empresa": empresa,
                    "usuario": dados['usuario'],
                    "senha": dados['senha'],
                    "mensagem": f"Senha já alterada hoje às {dados['data_hora']} por {dados['solicitante_original']}. Nenhuma alteração necessária."
                }
            
            
            base = self.excel_handler.ler_base_especifica(empresa)
            senha_antiga = base['senha']
            nova_senha = self.password_generator.gerar_senha()

            automacao = AutomacaoSistema()
            automacao.iniciar_navegador()
            
            try:
                automacao.entrar_na_pagina(base['url'])
                automacao.login(base['usuario'], base['senha'])
                time.sleep(3)
                automacao.alterar_senha(base['url'], base['senha'], nova_senha)
                
                # Atualiza Excel
                self.excel_handler.atualizar_senha(empresa, nova_senha)
                
                # Registra no log COM SENHA ANTIGA
                self.excel_handler.registrar_alteracao(
                    empresa=empresa,
                    usuario=base['usuario'],
                    senha_antiga=senha_antiga,  
                    nova_senha=nova_senha,
                    solicitante=solicitante,
                    ip_solicitante=ip_solicitante
                )
                
                logger.info(f"✅ Senha alterada com sucesso: {empresa}")
                
                return {
                    "status": "sucesso",
                    "empresa": empresa,
                    "usuario": base['usuario'],
                    "senha": nova_senha,
                    "senha_antiga": senha_antiga,
                    "mensagem": "Senha alterada com sucesso"
                }
                
            finally:
                automacao.fechar_navegador()
                
        except Exception as e:
            logger.error(f"❌ Erro ao alterar senha de {empresa}: {e}")
            return {
                "status": "erro",
                "empresa": empresa,
                "mensagem": str(e)
            }
    def alterar_todas_senhas(self) -> list[dict]:
        """Altera senhas de todas as bases do Excel"""
        logger.info("Iniciando alteração de TODAS as senhas")
        
        bases = self.excel_handler.ler_bases()
        resultados = []
        
        for idx, base in bases.iterrows():
            logger.info(f"Processando [{idx+1}/{len(bases)}]: {base['empresa']}")
            
            resultado = self.alterar_senha_base(
                empresa=base['empresa'],
                solicitante="Sistema - Rotina Automática",
                ip_solicitante="Sistema Local"
            )
            
            resultados.append(resultado)
            
            # Aguarda entre execuções
            time.sleep(3)
        
        # Resumo
        sucesso = sum(1 for r in resultados if r['status'] == 'sucesso')
        erro = len(resultados) - sucesso
        
        logger.info(f"Alteração concluída: {sucesso} sucessos, {erro} erros")
        
        return resultados
