"""
Script para reverter senhas às 19h todos os dias
Executa automaticamente via Task Scheduler (Windows) ou cron (Linux)
"""
import sys
from pathlib import Path
ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))

import pandas as pd
from datetime import datetime, date
from src.automation.browser_automation import AutomacaoSistema
from src.utils.excel_handler import ExcelHandler
from src.utils.logger import setup_logger
from config.settings import settings
import time

logger = setup_logger(__name__)


def reverter_senhas_do_dia():
    """
    Reverte todas as senhas alteradas hoje para as senhas antigas
    LENDO DO JSON em vez do Excel
    """
    logger.info("="*60)
    logger.info(f"INICIANDO REVERSÃO DE SENHAS - {datetime.now().strftime('%d/%m/%Y %H:%M')}")
    logger.info("="*60)
    
    try:
        # IMPORTAR FUNÇÕES DO JSON
        sys.path.insert(0, str(ROOT_DIR))
        from src.api.main import carregar_solicitacoes, salvar_solicitacoes, gerar_proximo_id
        
        # Ler solicitações do JSON
        solicitacoes = carregar_solicitacoes()
        
        # Filtrar solicitações de hoje que NÃO foram reutilizadas
        hoje = date.today().strftime("%Y-%m-%d")
        
        solicitacoes_hoje = [
            sol for sol in solicitacoes
            if sol.get('data_hora', '').startswith(hoje) 
            and not sol.get('reutilizada', False)
            and sol.get('senha_antiga')
            and sol.get('status') == 'sucesso'
        ]
        
        if not solicitacoes_hoje:
            logger.info("Nenhuma senha para reverter hoje")
            return []
        
        logger.info(f"Encontradas {len(solicitacoes_hoje)} senhas para reverter")
        
        excel_handler = ExcelHandler(settings.bases_file)
        automacao = AutomacaoSistema()
        
        resultados = []
        
        for idx, sol in enumerate(solicitacoes_hoje):
            empresa = sol['cliente']
            senha_antiga = sol['senha_antiga']
            senha_atual = sol['senha']
            usuario = sol['usuario']
            
            logger.info(f"\n[{idx + 1}/{len(solicitacoes_hoje)}] Revertendo: {empresa}")
            logger.info(f"  Senha atual: {senha_atual}")
            logger.info(f"  Voltando para: {senha_antiga}")
            
            try:
                # Ler dados da base
                base = excel_handler.ler_base_especifica(empresa)
                
                # Iniciar navegador
                automacao.iniciar_navegador()
                
                try:
                    # 1. Acessar página
                    logger.info(f"  → Acessando {base['url']}")
                    automacao.entrar_na_pagina(base['url'])
                    time.sleep(2)
                    
                    # 2. Fazer login com senha ATUAL (nova)
                    logger.info(f"  → Fazendo login...")
                    automacao.login(usuario, senha_atual)
                    time.sleep(3)
                    
                    # 3. Alterar senha de volta para ANTIGA
                    logger.info(f"  → Revertendo senha...")
                    automacao.alterar_senha(base['url'], senha_atual, senha_antiga)
                    time.sleep(2)
                    
                    # 4. Atualizar Excel com senha antiga
                    logger.info(f"  → Atualizando Excel...")
                    excel_handler.atualizar_senha(empresa, senha_antiga)
                    
                    # 5. Registrar reversão no JSON
                    nova_reversao = {
                        "id": gerar_proximo_id(solicitacoes),
                        "cliente": empresa,
                        "usuario": usuario,
                        "senha": senha_antiga,  # voltou para antiga
                        "senha_antiga": senha_atual,  # estava com essa
                        "solicitante": "Sistema - Reversão 19h",
                        "usuario_sistema": "sistema",
                        "ip_solicitante": "automacao",
                        "data_hora": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "observacao": f"Reversão automática - referente à solicitação ID {sol['id']}",
                        "status": "revertida"
                    }
                    solicitacoes.append(nova_reversao)
                    salvar_solicitacoes(solicitacoes)
                    
                    logger.info(f"  {empresa} - Senha revertida com sucesso!")
                    
                    resultados.append({
                        "empresa": empresa,
                        "status": "sucesso",
                        "mensagem": "Senha revertida"
                    })
                    
                except Exception as e:
                    logger.error(f"  Erro na automação: {e}")
                    resultados.append({
                        "empresa": empresa,
                        "status": "erro",
                        "mensagem": str(e)
                    })
                
                finally:
                    automacao.fechar_navegador()
                    time.sleep(2)
                    
            except Exception as e:
                logger.error(f"  Erro ao processar {empresa}: {e}")
                resultados.append({
                    "empresa": empresa,
                    "status": "erro",
                    "mensagem": str(e)
                })
        
        # Gerar relatório final
        logger.info("\n" + "="*60)
        logger.info("RESUMO DA REVERSÃO:")
        logger.info("="*60)
        
        sucesso = sum(1 for r in resultados if r['status'] == 'sucesso')
        erro = len(resultados) - sucesso
        
        logger.info(f"Total processado: {len(resultados)}")
        logger.info(f"Sucesso: {sucesso}")
        logger.info(f"Erros: {erro}")
        
        if erro > 0:
            logger.info("\nEmpresas com erro:")
            for r in resultados:
                if r['status'] == 'erro':
                    logger.error(f"  - {r['empresa']}: {r['mensagem']}")
        
        logger.info("="*60)
        logger.info("REVERSÃO CONCLUÍDA!")
        logger.info("="*60)
        
        return resultados
        
    except FileNotFoundError:
        logger.info("Nenhuma solicitação encontrada.")
        return []
    except Exception as e:
        logger.error(f"Erro geral na reversão: {e}")
        import traceback
        traceback.print_exc()
        return []


if __name__ == "__main__":
    """
    Execução principal do script
    """
    logger.info("\n\n")
    logger.info("#"*60)
    logger.info("# SCRIPT DE REVERSÃO DE SENHAS - EXECUÇÃO AUTOMÁTICA")
    logger.info("#"*60)
    logger.info(f"Data/Hora: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
    logger.info(f"Executado por: Agendador do Sistema")
    logger.info("#"*60)
    
    try:
        resultados = reverter_senhas_do_dia()
        
        if resultados:

            relatorio_path = settings.logs_dir / f"reversao_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
            
            with open(relatorio_path, 'w', encoding='utf-8') as f:
                f.write("="*60 + "\n")
                f.write(f"RELATÓRIO DE REVERSÃO DE SENHAS\n")
                f.write(f"Data: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}\n")
                f.write("="*60 + "\n\n")
                
                for r in resultados:
                    f.write(f"Empresa: {r['empresa']}\n")
                    f.write(f"Status: {r['status']}\n")
                    f.write(f"Mensagem: {r['mensagem']}\n")
                    f.write("-"*60 + "\n")
                
                sucesso = sum(1 for r in resultados if r['status'] == 'sucesso')
                erro = len(resultados) - sucesso
                
                f.write("\n" + "="*60 + "\n")
                f.write(f"TOTAL: {len(resultados)}\n")
                f.write(f"SUCESSO: {sucesso}\n")
                f.write(f"ERROS: {erro}\n")
                f.write("="*60 + "\n")
            
            logger.info(f"\n📄 Relatório salvo em: {relatorio_path}")
        
        logger.info("\n✅ Script finalizado com sucesso!")
        sys.exit(0)
        
    except Exception as e:
        logger.error(f"\n❌ Erro fatal: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
