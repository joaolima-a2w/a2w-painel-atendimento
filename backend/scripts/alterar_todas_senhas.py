"""
Script para alterar senhas de TODAS as bases
Execute este script periodicamente (ex: mensalmente)
"""

import sys
from pathlib import Path
ROOT_DIR = Path(__file__).parent.parent
sys.path.insert(0, str(ROOT_DIR))

from src.automation.password_changer import GerenciadorSenhas
from src.utils.logger import setup_logger

logger = setup_logger(__name__)

def main():
    """Executa alteração de todas as senhas"""
    
    print("="*60)
    print("ALTERAÇÃO EM MASSA DE SENHAS")
    print("="*60)
    print()
    confirmacao = input("⚠️  Deseja REALMENTE alterar TODAS as senhas do Excel? (sim/nao): ")
    
    if confirmacao.lower() != 'sim':
        print("\n❌ Operação cancelada pelo usuário.")
        sys.exit(0)
    
    print("\n🚀 Iniciando processo de alteração em massa...\n")
    
    try:
        gerenciador = GerenciadorSenhas()
        resultados = gerenciador.alterar_todas_senhas()
        print("\n" + "="*60)
        print("📊 RESUMO DA EXECUÇÃO")
        print("="*60)
        
        sucessos = 0
        erros = 0
        
        for resultado in resultados:
            status_icon = "✅" if resultado['status'] == 'sucesso' else "❌"
            print(f"{status_icon} {resultado['empresa']}: {resultado['mensagem']}")
            
            if resultado['status'] == 'sucesso':
                sucessos += 1
            else:
                erros += 1
        
        print("\n" + "="*60)
        print(f"✅ Sucessos: {sucessos}")
        print(f"❌ Erros: {erros}")
        print(f"📝 Total processado: {len(resultados)}")
        print("="*60)
        
        print("\n📄 Detalhes salvos em:")
        print("   - data/senhas_geradas.xlsx (log de senhas)")
        print("   - data/bases.xlsx (senhas atualizadas)")
        print("   - logs/ (logs de execução)")
        
        print("\n✅ Processo concluído!")
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Processo interrompido pelo usuário (Ctrl+C)")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Erro fatal durante execução: {e}")
        logger.error(f"Erro fatal: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
