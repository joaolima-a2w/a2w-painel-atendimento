from playwright.sync_api import sync_playwright, Page, Browser, BrowserContext
from config.settings import settings
import logging
import re

logger = logging.getLogger(__name__)

class AutomacaoSistema:
    def __init__(self, headless: bool = None, slow_mo: int = None):
        self.headless = headless if headless is not None else settings.headless
        self.slow_mo = slow_mo if slow_mo is not None else settings.slow_mo
        self.playwright = None
        self.browser: Browser = None
        self.context: BrowserContext = None
        self.page: Page = None
        self.nome_empresa_logada = None
        
    def iniciar_navegador(self):
        """Inicia o navegador com anti-detecção"""
        self.playwright = sync_playwright().start()
        
        self.browser = self.playwright.chromium.launch(
            headless=False,  # Deixe False para evitar detecção
            slow_mo=self.slow_mo,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-web-security',
            ]
        )
        
        self.context = self.browser.new_context(
            viewport={"width": 1920, "height": 1080},
            locale="pt-BR",
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36"
        )
        
        # ⭐ Scripts anti-detecção
        self.context.add_init_script("""
            Object.defineProperty(navigator, 'webdriver', {
                get: () => undefined
            });
            
            window.navigator.chrome = {
                runtime: {}
            };
            
            Object.defineProperty(navigator, 'plugins', {
                get: () => [1, 2, 3, 4, 5]
            });
            
            Object.defineProperty(navigator, 'languages', {
                get: () => ['pt-BR', 'pt', 'en-US', 'en']
            });
        """)
        self.page = self.context.new_page()
        logger.info("Navegador iniciado com anti-detecção")
        
    def entrar_na_pagina(self, url: str):
        """Navega até a página"""
        logger.info(f"Navegando para: {url}")
        self.page.goto(url, wait_until="networkidle", timeout=60000)
        
    def login(self, usuario: str, senha: str):
        """Realiza login"""
        logger.info(f"Realizando login: {usuario}")
        
        self.page.get_by_role("textbox", name="E-mail").click()
        self.page.get_by_role("textbox", name="E-mail").fill(usuario)
        self.page.get_by_role("textbox", name="Senha").click()
        self.page.get_by_role("textbox", name="Senha").fill(senha)
        self.page.get_by_role("button", name="ENTRAR", exact=True).click()
        
        self.page.wait_for_load_state("networkidle")
        logger.info("Login realizado com sucesso")
                
    def alterar_senha(self, url: str, senha_atual: str, senha_nova: str):
        """Altera a senha"""
        logger.info("Iniciando alteração de senha...")
        
        self.page.goto(f"{url}a2w/perfil-user", wait_until="networkidle")
        
        self.page.wait_for_timeout(2000)
        
        self.page.get_by_role("tab", name="Alterar Senha").click()
        
        self.page.wait_for_timeout(1000)

        self.page.get_by_role("textbox", name="Senha atual:").click()
        self.page.get_by_role("textbox", name="Senha atual:").fill(senha_atual)

        self.page.get_by_role("textbox", name="Nova senha:").click()
        self.page.get_by_role("textbox", name="Nova senha:").fill(senha_nova)

        self.page.wait_for_timeout(500)

        logger.info("Clicando em Salvar Senha...")
        self.page.click("#updateSenha")

        self.page.wait_for_load_state("networkidle")
        self.page.wait_for_timeout(2000)
        
        logger.info("Senha alterada com sucesso!")
        
    def atualizar(self):
        """Atualiza a página"""
        self.page.get_by_role("button", name="Atualizar").click()
        
    def fechar_navegador(self):
        """Fecha o navegador"""
        if self.browser:
            self.browser.close()
        if self.playwright:
            self.playwright.stop()
        logger.info("Navegador fechado")
    
    def pausar_para_mapeamento(self):
        """Pausa para mapear seletores"""
        print("\n=== MODO DE MAPEAMENTO ===")
        self.page.pause()
