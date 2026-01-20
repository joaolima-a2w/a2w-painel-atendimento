"""
Sistema de Gestão de Senhas
Interface Streamlit com autenticação e painel administrativo
Integrado com automação Playwright
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

import streamlit as st
import streamlit_authenticator as stauth
import yaml
from yaml.loader import SafeLoader
import requests
import pandas as pd
from datetime import datetime
import os
from config.settings import settings

# Configuração da página
st.set_page_config(
    page_title="Gerador de Senhas",
    page_icon="🔐",
    layout="wide",
    initial_sidebar_state="expanded"
)

# URL da API
API_URL = f"http://localhost:{settings.api_port}"

# Carregar configuração de usuários
YAML_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    'config',
    'usuarios.yaml'
)

with open(YAML_PATH, encoding='utf-8') as file:
    config = yaml.load(file, Loader=SafeLoader)

# Criar autenticador
authenticator = stauth.Authenticate(
    config['credentials'],
    config['cookie']['name'],
    config['cookie']['key'],
    config['cookie']['expiry_days']
)

# Login
try:
    name, authentication_status, username = authenticator.login('Login', 'main')
except:
    authenticator.login(location='main')
    if st.session_state.get("authentication_status"):
        name = st.session_state["name"]
        username = st.session_state["username"]
        authentication_status = st.session_state["authentication_status"]
    else:
        name = None
        username = None
        authentication_status = None

# Verificar autenticação
if authentication_status == False:
    st.error('Usuario ou senha incorretos')
    st.stop()

if authentication_status == None:
    st.warning('Por favor, faca login para acessar o sistema')
    st.info("**Sistema de Gestão de Senhas**\n\nEntre com suas credenciais para continuar.")
    st.markdown("---")
    st.markdown("**Suporte:** Em caso de problemas, contate o administrador")
    st.stop()

# ========================================
# SISTEMA (APÓS LOGIN)
# ========================================
if authentication_status:
    # Pegar role do usuário
    user_role = config['credentials']['usernames'][username].get('role', 'user')
    
    # SIDEBAR
    authenticator.logout('Logout', 'sidebar')
    st.sidebar.success(f'Usuario: {name}')
    st.sidebar.info(f'Perfil: {user_role.upper()}')
    st.sidebar.markdown("---")
    
    # Menu baseado em permissões
    if user_role == 'admin':
        menu = st.sidebar.radio(
            "Menu",
            ["Solicitar Senha", "Painel Admin", "Dashboard A2W", "Relatorios", "Sobre"]
        )
    else:
        menu = st.sidebar.radio(
            "Menu",
            ["Solicitar Senha", "Dashboard A2W", "Sobre"]
        )

    
    st.sidebar.markdown("---")
    st.sidebar.markdown("**Gerador de Senhas v2.0**")
    st.sidebar.markdown(f"*Usuario: {username}*")
    
    # ========================================
    # PÁGINA: SOLICITAR SENHA (TODOS)
    # ========================================
    if menu == "Solicitar Senha":
        st.title("Sistema de Gestao de Senhas")
        st.markdown("---")
        
        st.header("Nova Solicitacao")
        
        # Carregar dados do Excel
        try:
            df_bases = pd.read_excel(settings.bases_file)
            
            # Verificar se tem as colunas necessárias
            required_cols = ['empresa', 'url', 'usuario', 'senha']
            if not all(col in df_bases.columns for col in required_cols):
                st.error(f"O arquivo Excel deve conter as colunas: {', '.join(required_cols)}")
                st.info("Colunas encontradas: " + ", ".join(df_bases.columns.tolist()))
                st.stop()
            
            # Remover valores vazios/nulos
            df_bases = df_bases.dropna(subset=['empresa'])
            
            # Lista de empresas disponíveis
            empresas_disponiveis = sorted(df_bases['empresa'].unique().tolist())
            
            excel_carregado = True
            
        except FileNotFoundError:
            st.error(f"Arquivo não encontrado: {settings.bases_file}")
            st.info("Crie o arquivo data/bases.xlsx com as colunas: empresa, url, usuario, senha")
            empresas_disponiveis = []
            excel_carregado = False
        except Exception as e:
            st.error(f"Erro ao carregar Excel: {str(e)}")
            st.exception(e)
            empresas_disponiveis = []
            excel_carregado = False
        
        if excel_carregado and empresas_disponiveis:
            # Dropdown de Empresa
            empresa_selecionada = st.selectbox(
                "Empresa *",
                options=empresas_disponiveis,
                help="Selecione a empresa/cliente"
            )
            
            # Buscar dados da empresa selecionada
            dados_empresa = df_bases[df_bases['empresa'] == empresa_selecionada].iloc[0]
            
            # Mostrar informações da empresa
            st.markdown("---")
            st.subheader("Informacoes da Empresa Selecionada")
            
            col_info1, col_info2 = st.columns(2)
            
            with col_info1:
                st.info(f"**URL:** {dados_empresa['url']}")
                st.info(f"**Usuario Atual:** {dados_empresa['usuario']}")
            
            with col_info2:
                # Mostrar senha atual APENAS para ADMIN
                if user_role == 'admin':
                    if st.checkbox("Mostrar senha atual", key="show_senha"):
                        st.info(f"**Senha Atual:** {dados_empresa['senha']}")
                    else:
                        st.info(f"**Senha Atual:** {'*' * 12}")
                else:
                    # Usuários normais NÃO veem a senha
                    st.info(f"**Senha Atual:** (Oculta - Apenas Admin)")
            
            st.markdown("---")
            
            # Observação
            observacao = st.text_area(
                "Observacao",
                placeholder="Informacoes adicionais sobre a alteracao (opcional)"
            )
            
            st.markdown("---")
            
            # Aviso sobre automação
            st.warning("**ATENCAO:** Ao clicar no botao abaixo, o sistema ira AUTOMATICAMENTE entrar no sistema e alterar a senha. Aguarde o processo finalizar.")
            
            # Botão para gerar senha
            col_btn1, col_btn2, col_btn3 = st.columns([1, 2, 1])
            with col_btn2:
                if st.button("GERAR E ALTERAR SENHA", type="primary", use_container_width=True):
                    with st.spinner("Executando automacao... Por favor, aguarde (pode demorar 1-2 minutos)..."):
                        
                        payload = {
                            "cliente": empresa_selecionada,
                            "usuario": dados_empresa['usuario'],
                            "base": dados_empresa['url'],
                            "observacao": observacao,
                            "solicitante": username,
                            "ip_solicitante": "streamlit"
                        }
                        
                        try:
                            response = requests.post(
                                f"{API_URL}/solicitar",
                                json=payload,
                                timeout=300  # 5 minutos para automação
                            )
                            
                            if response.status_code == 200:
                                data = response.json()
                                
                                # Verificar se a automação funcionou
                                automacao = data.get('automacao', {})
                                
                                if automacao.get('sucesso'):
                                    st.success("Senha alterada com sucesso no sistema!")
                                else:
                                    st.warning("Senha gerada, mas houve problema na automacao")
                                
                                st.markdown("---")
                                
                                # Exibir credenciais
                                st.subheader("Novas Credenciais de Acesso")
                                
                                col_cred1, col_cred2, col_cred3 = st.columns(3)
                                
                                with col_cred1:
                                    st.metric("Empresa", empresa_selecionada)
                                
                                with col_cred2:
                                    st.metric("Usuario", data['usuario'])
                                
                                with col_cred3:
                                    if automacao.get('sucesso'):
                                        st.metric("Status Automacao", "OK")
                                    else:
                                        st.metric("Status Automacao", "ERRO")
                                
                                st.markdown("---")
                                
                                # Senha em destaque
                                st.markdown(f"### Nova Senha: **{data['senha']}**")
                                
                                st.markdown("---")
                                
                                # Informações completas para copiar
                                st.info("**Copie todas as informacoes abaixo:**")
                                st.code(f"""Empresa: {empresa_selecionada}
URL: {dados_empresa['url']}
Usuario: {data['usuario']}
Nova Senha: {data['senha']}
Data: {data['data_hora']}
Solicitante: {username}
Status Automacao: {'Sucesso' if automacao.get('sucesso') else 'Erro'}""")
                                
                                st.markdown("---")
                                
                                if automacao.get('sucesso'):
                                    st.success("A senha JA FOI ALTERADA no sistema automaticamente!")
                                    st.success("Voce ja pode usar as novas credenciais!")
                                else:
                                    st.error("ATENCAO: A automacao falhou. Altere a senha manualmente no sistema!")
                                    st.error(f"Motivo: {automacao.get('mensagem', 'Erro desconhecido')}")
                                
                                st.balloons()
                            else:
                                error_data = response.json()
                                error_msg = error_data.get('detail', 'Erro desconhecido')
                                st.error(f"Erro ao processar: {error_msg}")
                                
                        except requests.exceptions.ConnectionError:
                            st.error("Erro de conexao com a API. Verifique se ela esta rodando.")
                            st.info(f"Certifique-se de que a API esta ativa em: {API_URL}")
                        except requests.exceptions.Timeout:
                            st.error("Timeout: A automacao demorou mais de 5 minutos. Verifique o log da API.")
                        except Exception as e:
                            st.error(f"Erro inesperado: {str(e)}")
                            st.exception(e)
        else:
            st.warning("Nenhuma empresa disponivel. Verifique o arquivo Excel.")
    
    # ========================================
    # PÁGINA: PAINEL ADMIN (APENAS ADMIN)
    # ========================================
    elif menu == "Painel Admin" and user_role == 'admin':
        st.title("Painel Administrativo")
        st.markdown("---")
        
        tab1, tab2, tab3 = st.tabs(["Alteracao em Massa", "Listagem Completa", "Alterar Todas"])
        
        # ===== TAB 1: ALTERAÇÃO EM MASSA (UPLOAD EXCEL) =====
        with tab1:
            st.subheader("Processar Multiplas Solicitacoes")
            st.info("Faca upload de um arquivo Excel com a coluna: **empresa**")
            
            uploaded_file = st.file_uploader(
                "Selecione o arquivo Excel",
                type=['xlsx', 'xls'],
                help="O arquivo deve conter a coluna: empresa"
            )
            
            if uploaded_file:
                try:
                    df = pd.read_excel(uploaded_file)
                    
                    # Validar colunas
                    if 'empresa' not in df.columns:
                        st.error("O arquivo deve conter a coluna: empresa")
                    else:
                        st.success(f"Arquivo carregado: {len(df)} registros")
                        st.dataframe(df, use_container_width=True)
                        
                        st.markdown("---")
                        
                        observacao_massa = st.text_input(
                            "Observacao para todas",
                            value=f"Alteracao em massa - {datetime.now().strftime('%d/%m/%Y %H:%M')}"
                        )
                        
                        st.warning("Cada empresa pode demorar 1-2 minutos. Total estimado: " + 
                                 f"{len(df) * 2} minutos")
                        
                        if st.button("PROCESSAR TODAS COM AUTOMACAO", type="primary"):
                            progress_bar = st.progress(0)
                            status_text = st.empty()
                            
                            resultados = []
                            total = len(df)
                            
                            for idx, row in df.iterrows():
                                status_text.text(f"Processando {idx + 1}/{total}: {row['empresa']}... (aguarde)")
                                
                                payload = {
                                    "cliente": str(row['empresa']),
                                    "usuario": "",
                                    "base": "",
                                    "observacao": observacao_massa,
                                    "solicitante": username,
                                    "ip_solicitante": "streamlit_massa"
                                }
                                
                                try:
                                    response = requests.post(
                                        f"{API_URL}/solicitar",
                                        json=payload,
                                        timeout=300
                                    )
                                    
                                    if response.status_code == 200:
                                        data = response.json()
                                        automacao = data.get('automacao', {})
                                        
                                        resultados.append({
                                            "Status": "OK" if automacao.get('sucesso') else "ERRO",
                                            "Empresa": row['empresa'],
                                            "Usuario": data.get('usuario', '-'),
                                            "Senha": data.get('senha', '-'),
                                            "Senha": data.get('senha', '-'),
                                            "Automacao": "Sucesso" if automacao.get('sucesso') else automacao.get('mensagem', 'Erro')[:50],
                                            "Data/Hora": data.get('data_hora', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
                                        })
                                    else:
                                        resultados.append({
                                            "Status": "ERRO",
                                            "Empresa": row['empresa'],
                                            "Usuario": "-",
                                            "Senha": "-",
                                            "Automacao": f"Erro HTTP {response.status_code}",
                                            "Data/Hora": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                                        })
                                except Exception as e:
                                    resultados.append({
                                        "Status": "ERRO",
                                        "Empresa": row['empresa'],
                                        "Usuario": "-",
                                        "Senha": "-",
                                        "Automacao": str(e)[:50],
                                        "Data/Hora": datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                                    })
                                
                                progress = (idx + 1) / total
                                progress_bar.progress(progress)
                            
                            status_text.text("Processamento concluido!")
                            st.success(f"Processadas {len(resultados)} solicitacoes!")
                            
                            # Exibir resultados
                            df_result = pd.DataFrame(resultados)
                            st.dataframe(df_result, use_container_width=True)
                            
                            # Contadores
                            sucesso = len([r for r in resultados if r['Status'] == 'OK'])
                            erro = len([r for r in resultados if r['Status'] == 'ERRO'])
                            
                            col_s1, col_s2, col_s3 = st.columns(3)
                            with col_s1:
                                st.metric("Total", len(resultados))
                            with col_s2:
                                st.metric("Sucesso", sucesso)
                            with col_s3:
                                st.metric("Erros", erro)
                            
                            # Download
                            csv = df_result.to_csv(index=False, encoding='utf-8-sig').encode('utf-8-sig')
                            st.download_button(
                                "Baixar Resultado (CSV)",
                                csv,
                                f"resultado_massa_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                                "text/csv",
                                key='download-csv'
                            )
                            
                except Exception as e:
                    st.error(f"Erro ao processar arquivo: {str(e)}")
        
        # ===== TAB 2: LISTAGEM =====
        with tab2:
            st.subheader("Historico de Alteracoes")
            
            if st.button("Atualizar Dados"):
                st.rerun()
            
            try:
                # Ler do Excel de log
                df_log = pd.read_excel("data/senhas_geradas.xlsx")
                
                if not df_log.empty:
                    st.info(f"Total de registros: **{len(df_log)}**")
                    
                    # Filtros
                    col_f1, col_f2 = st.columns(2)
                    
                    with col_f1:
                        if 'empresa' in df_log.columns:
                            empresas_filtro = ['Todas'] + sorted(df_log['empresa'].unique().tolist())
                            empresa_filtro = st.selectbox("Filtrar por Empresa", empresas_filtro)
                    
                    with col_f2:
                        if 'solicitante' in df_log.columns:
                            solicitantes_filtro = ['Todos'] + sorted(df_log['solicitante'].unique().tolist())
                            solicitante_filtro = st.selectbox("Filtrar por Solicitante", solicitantes_filtro)
                    
                    # Aplicar filtros
                    df_filtrado = df_log.copy()
                    if empresa_filtro != 'Todas':
                        df_filtrado = df_filtrado[df_filtrado['empresa'] == empresa_filtro]
                    if solicitante_filtro != 'Todos':
                        df_filtrado = df_filtrado[df_filtrado['solicitante'] == solicitante_filtro]
                    
                    st.dataframe(df_filtrado, use_container_width=True, height=400)
                    
                    # Download
                    csv = df_filtrado.to_csv(index=False, encoding='utf-8-sig').encode('utf-8-sig')
                    st.download_button(
                        "Baixar Listagem Filtrada (CSV)",
                        csv,
                        f"listagem_{datetime.now().strftime('%Y%m%d')}.csv",
                        "text/csv"
                    )
                else:
                    st.info("Nenhuma alteracao registrada ainda")
                    
            except FileNotFoundError:
                st.info("Arquivo de log nao encontrado. Nenhuma alteracao foi feita ainda.")
            except Exception as e:
                st.error(f"Erro ao carregar dados: {str(e)}")
        
        # ===== TAB 3: ALTERAR TODAS AS BASES =====
        with tab3:
            st.subheader("Alterar TODAS as Senhas do Excel")
            
            st.warning("Esta operacao ira alterar a senha de TODAS as empresas cadastradas no arquivo bases.xlsx")
            
            try:
                df_bases = pd.read_excel(settings.bases_file)
                st.info(f"Total de empresas no Excel: **{len(df_bases)}**")
                st.dataframe(df_bases[['empresa', 'url']], use_container_width=True)
                
                st.markdown("---")
                
                tempo_estimado = len(df_bases) * 2
                st.warning(f"Tempo estimado: **{tempo_estimado} minutos** (aprox. 2 min por empresa)")
                
                confirmar = st.checkbox("Confirmo que quero alterar TODAS as senhas")
                
                if confirmar:
                    if st.button("EXECUTAR ALTERACAO EM TODAS AS BASES", type="primary"):
                        
                        with st.spinner("Executando alteracao em massa... Aguarde..."):
                            try:
                                response = requests.post(
                                    f"{API_URL}/solicitar-massa",
                                    timeout=tempo_estimado * 60  # timeout em segundos
                                )
                                
                                if response.status_code == 200:
                                    data = response.json()
                                    
                                    st.success(data['message'])
                                    
                                    col_r1, col_r2, col_r3 = st.columns(3)
                                    with col_r1:
                                        st.metric("Total Processado", data['total'])
                                    with col_r2:
                                        st.metric("Sucesso", data['sucesso'])
                                    with col_r3:
                                        st.metric("Erros", data['erro'])
                                    
                                    # Detalhes
                                    if 'resultados' in data:
                                        st.subheader("Detalhes por Empresa")
                                        df_result = pd.DataFrame(data['resultados'])
                                        st.dataframe(df_result, use_container_width=True)
                                        
                                        # Download
                                        csv = df_result.to_csv(index=False, encoding='utf-8-sig').encode('utf-8-sig')
                                        st.download_button(
                                            "Baixar Relatorio Completo (CSV)",
                                            csv,
                                            f"alteracao_massa_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv",
                                            "text/csv"
                                        )
                                else:
                                    st.error("Erro ao processar alteracao em massa")
                                    
                            except requests.exceptions.Timeout:
                                st.error("Timeout: A operacao demorou muito. Verifique o log da API.")
                            except Exception as e:
                                st.error(f"Erro: {str(e)}")
                                
            except FileNotFoundError:
                st.error("Arquivo bases.xlsx nao encontrado")
            except Exception as e:
                st.error(f"Erro ao carregar bases: {str(e)}")
    
    # ========================================
    # PÁGINA: RELATÓRIOS (APENAS ADMIN)
    # ========================================
    elif menu == "Relatorios" and user_role == 'admin':
        st.title("Relatorios e Estatisticas")
        st.markdown("---")
        
        try:
            df_log = pd.read_excel("data/senhas_geradas.xlsx")
            
            if not df_log.empty:
                # Métricas
                col1, col2, col3 = st.columns(3)
                
                with col1:
                    st.metric("Total de Alteracoes", len(df_log))
                
                with col2:
                    if 'empresa' in df_log.columns:
                        st.metric("Empresas Diferentes", df_log['empresa'].nunique())
                
                with col3:
                    if 'solicitante' in df_log.columns:
                        st.metric("Usuarios Solicitantes", df_log['solicitante'].nunique())
                
                st.markdown("---")
                
                # Gráficos
                col_g1, col_g2 = st.columns(2)
                
                with col_g1:
                    if 'empresa' in df_log.columns:
                        st.subheader("Alteracoes por Empresa")
                        empresa_counts = df_log['empresa'].value_counts().head(10)
                        st.bar_chart(empresa_counts)
                
                with col_g2:
                    if 'solicitante' in df_log.columns:
                        st.subheader("Alteracoes por Solicitante")
                        user_counts = df_log['solicitante'].value_counts()
                        st.bar_chart(user_counts)
                
                st.markdown("---")
                
                # Timeline
                if 'data_hora' in df_log.columns:
                    st.subheader("Timeline de Alteracoes")
                    
                    df_log['data'] = pd.to_datetime(df_log['data_hora']).dt.date
                    data_counts = df_log['data'].value_counts().sort_index()
                    
                    st.line_chart(data_counts)
                
                st.markdown("---")
                
                # Últimas alterações
                st.subheader("Ultimas 10 Alteracoes")
                df_recentes = df_log.tail(10).sort_values('data_hora', ascending=False)
                st.dataframe(df_recentes, use_container_width=True)
                
            else:
                st.info("Nenhum dado para exibir")
                
        except FileNotFoundError:
            st.info("Arquivo de log nao encontrado. Nenhuma alteracao foi feita ainda.")
        except Exception as e:
            st.error(f"Erro ao carregar dados: {str(e)}")

    # ========================================
    # PÁGINA: DASHBOARD A2W (TODOS)
    # ========================================
    elif menu == "Dashboard A2W":
        st.title("Dashboard A2W - Clientes e Integracoes")
        st.markdown("---")
        
        # Carregar o HTML do dashboard
        import streamlit.components.v1 as components
        
        # Ler o arquivo HTML anexado
        try:
            # Caminho para o arquivo HTML
            html_path = Path(__file__).parent.parent / "templates" / "dashboard_a2w.html"
            
            if html_path.exists():
                with open(html_path, 'r', encoding='utf-8') as f:
                    html_content = f.read()
                
                # Renderizar o HTML completo
                components.html(html_content, height=1200, scrolling=True)
                
            else:
                st.error("Arquivo HTML do dashboard não encontrado!")
                st.info(f"Esperado em: {html_path}")
                
                # Instruções para criar o arquivo
                st.markdown("""
                **Como configurar:**
                1. Crie a pasta `templates` na raiz do projeto
                2. Coloque o arquivo `A2W-Dashboard.html` dentro dela
                3. Recarregue esta página
                """)
                
        except Exception as e:
            st.error(f"Erro ao carregar dashboard: {e}")
            st.exception(e)
    
    # ========================================
    # PÁGINA: SOBRE (TODOS)
    # ========================================
    elif menu == "Sobre":
        st.title("Sobre o Sistema")
        st.markdown("---")
        
        st.header("Sistema de Gestao de Senhas v2.0")
        
        st.markdown("""
        ### Funcionalidades
        
        **Para todos os usuarios:**
        - Solicitacao de alteracao de senha com automacao
        - Sistema acessa automaticamente e troca a senha
        - Visualizacao das novas credenciais
        
        **Apenas para administradores:**
        - Visualizar senha atual das empresas
        - Alteracao em massa via Excel
        - Alterar todas as bases de uma vez
        - Listagem completa com filtros
        - Relatorios e estatisticas
        
        ### Como usar
        
        1. **Solicitacao Individual:**
           - Selecione a empresa
           - Clique em "Gerar e Alterar Senha"
           - Aguarde a automacao (1-2 minutos)
           - Copie as novas credenciais
        
        2. **Alteracao em Massa (Admin):**
           - Prepare um arquivo Excel com coluna: empresa
           - Faca upload no painel admin
           - Aguarde o processamento
           - Baixe o resultado em CSV
        
        3. **Alterar Todas as Bases (Admin):**
           - Acesse "Painel Admin" > "Alterar Todas"
           - Confirme a operacao
           - Aguarde (pode demorar bastante)
           - Veja o relatorio completo
        
        ### Informacoes Tecnicas
        """)
        
        col_info1, col_info2 = st.columns(2)
        
        with col_info1:
            st.info(f"""
            **Configuracoes:**
            - API: {API_URL}
            - Usuario: {username}
            - Perfil: {user_role.upper()}
            """)
        
        with col_info2:
            st.info(f"""
            **Sistema:**
            - Versao: 2.0
            - Framework: Streamlit
            - Backend: FastAPI
            - Automacao: Playwright
            """)
        
        st.markdown("---")
        
        # Teste de conectividade
        st.subheader("Status do Sistema")
        
        col_status1, col_status2 = st.columns(2)
        
        with col_status1:
            st.write("**API Status:**")
            try:
                response = requests.get(API_URL, timeout=5)
                if response.status_code == 200:
                    st.success("API Online")
                else:
                    st.warning(f"API respondendo com status: {response.status_code}")
            except:
                st.error("API Offline - Inicie a API antes de usar o sistema")
        
        with col_status2:
            st.write("**Arquivo de Bases:**")
            try:
                if settings.bases_file.exists():
                    df = pd.read_excel(settings.bases_file)
                    st.success(f"Arquivo OK - {len(df)} empresas cadastradas")
                else:
                    st.error("Arquivo bases.xlsx nao encontrado")
            except:
                st.warning("Erro ao verificar arquivo")
        
        st.markdown("---")
        st.caption("Desenvolvido para gestao automatizada de senhas com Playwright")

# CSS customizado
st.markdown("""
<style>
    .stButton>button {
        width: 100%;
    }
    div[data-testid="stMetricValue"] {
        font-size: 2rem;
    }
    .stAlert {
        margin-top: 1rem;
        margin-bottom: 1rem;
    }
</style>
""", unsafe_allow_html=True)


