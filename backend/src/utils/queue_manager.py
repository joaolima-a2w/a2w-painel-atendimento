"""
Gerenciador de Fila de Requisições
Evita conflitos quando múltiplas pessoas solicitam senha ao mesmo tempo
"""
import threading
import queue
import time
from typing import Callable, Any
from datetime import datetime


class FilaRequisicoes:
    """Gerencia fila de requisições para processamento sequencial"""
    
    def __init__(self):
        self.fila = queue.Queue()
        self.processando = False
        self.lock = threading.Lock()
        
    def adicionar(self, func: Callable, *args, **kwargs) -> Any:
        """
        Adiciona uma requisição à fila e aguarda processamento
        
        Args:
            func: Função a ser executada
            *args: Argumentos da função
            **kwargs: Argumentos nomeados da função
            
        Returns:
            Resultado da função executada
        """
        resultado_container = {"resultado": None, "erro": None, "concluido": False}
        
        def wrapper():
            try:
                resultado_container["resultado"] = func(*args, **kwargs)
            except Exception as e:
                resultado_container["erro"] = e
            finally:
                resultado_container["concluido"] = True
        
        # Adicionar à fila
        self.fila.put(wrapper)
        
        # Iniciar processamento se não estiver processando
        if not self.processando:
            threading.Thread(target=self._processar_fila, daemon=True).start()
        
        # Aguardar conclusão
        while not resultado_container["concluido"]:
            time.sleep(0.1)
        
        # Retornar resultado ou levantar erro
        if resultado_container["erro"]:
            raise resultado_container["erro"]
        
        return resultado_container["resultado"]
    
    def _processar_fila(self):
        """Processa itens da fila sequencialmente"""
        with self.lock:
            self.processando = True
            
            try:
                while not self.fila.empty():
                    item = self.fila.get()
                    print(f"[FILA] Processando requisição... ({self.fila.qsize()} na fila)")
                    item()
                    self.fila.task_done()
                    print(f"[FILA] Requisição concluída!")
            finally:
                self.processando = False


# Instância global
fila_global = FilaRequisicoes()
