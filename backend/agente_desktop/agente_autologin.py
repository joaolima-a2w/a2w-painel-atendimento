from http.server import HTTPServer, BaseHTTPRequestHandler
from playwright.sync_api import sync_playwright
import json
import threading
import logging
import requests
from datetime import datetime

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(message)s')
logger = logging.getLogger(__name__)

API_URL = "http://192.168.0.190:8000"

def enviar_log(dados):
    """Envia log para API central (não bloqueia se falhar)"""
    try:
        requests.post(f"{API_URL}/logs/atividade", json=dados, timeout=2)
    except:
        pass  # Silenciosamente falha se API não responder

class AgenteHandler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/ping':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "online"}).encode())
    
    def do_POST(self):
        if self.path == '/auto-login':
            content_length = int(self.headers['Content-Length'])
            body = self.rfile.read(content_length)
            dados = json.loads(body)
            
            def executar():
                with sync_playwright() as p:
                    try:
                        tempo_inicio = datetime.now()
                        
                        logger.info(f"Login: {dados['empresa']}")
                        
                        browser = p.chromium.launch(headless=False, args=['--start-maximized'])
                        page = browser.new_page()
                        
                        # LOG: Sessão iniciada
                        enviar_log({
                            'timestamp': tempo_inicio.strftime('%Y-%m-%d %H:%M:%S'),
                            'empresa': dados['empresa'],
                            'usuario': dados['usuario'],
                            'tipo': 'sessao_iniciada',
                            'url': dados['url']
                        })
                        
                        logger.info(f"Abrindo: {dados['url']}")
                        page.goto(dados['url'], timeout=30000)
                        
                        logger.info("Aguardando formulário...")
                        page.wait_for_selector('input[type="email"], input[type="password"]', timeout=10000)
                        
                        logger.info("Preenchendo...")
                        page.get_by_role("textbox", name="E-mail").click()
                        page.get_by_role("textbox", name="E-mail").fill(dados['usuario'])
                        page.get_by_role("textbox", name="Senha").click()
                        page.get_by_role("textbox", name="Senha").fill(dados['senha'])
                        page.get_by_role("button", name="ENTRAR", exact=True).click()
                        page.wait_for_load_state('networkidle', timeout=15000)
                        
                        logger.info(f"LOGADO: {dados['empresa']}")
                        
                        # LOG: Login bem-sucedido
                        enviar_log({
                            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                            'empresa': dados['empresa'],
                            'usuario': dados['usuario'],
                            'tipo': 'login_sucesso',
                            'url': page.url
                        })
                        
                        input("Pressione Enter para fechar...")
                        
                        # LOG: Sessão encerrada
                        tempo_fim = datetime.now()
                        duracao = int((tempo_fim - tempo_inicio).total_seconds())
                        
                        enviar_log({
                            'timestamp': tempo_fim.strftime('%Y-%m-%d %H:%M:%S'),
                            'empresa': dados['empresa'],
                            'usuario': dados['usuario'],
                            'tipo': 'sessao_encerrada',
                            'duracao_segundos': duracao
                        })
                        
                        browser.close()
                        
                    except Exception as e:
                        logger.error(f"Erro: {e}")
                        
                        # LOG: Erro
                        enviar_log({
                            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
                            'empresa': dados.get('empresa', 'desconhecido'),
                            'usuario': dados.get('usuario', 'desconhecido'),
                            'tipo': 'erro',
                            'mensagem': str(e)
                        })
            
            thread = threading.Thread(target=executar, daemon=True)
            thread.start()
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"status": "success"}).encode())
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
    
    def log_message(self, format, *args):
        pass

if __name__ == '__main__':
    print("\n" + "="*60)
    print("  AGENTE DESKTOP A2W")
    print("="*60)
    print("  http://localhost:5555")
    print("  Logs: Enviados para " + API_URL)
    print("="*60 + "\n")
    
    server = HTTPServer(('127.0.0.1', 5555), AgenteHandler)
    server.serve_forever()
