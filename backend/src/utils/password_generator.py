import secrets
import string
from typing import Optional


class PasswordGenerator:
    """Gerador de senhas seguras"""
    
    def __init__(self, length: int = 16, complexity: str = "alta"):
        """
        Args:
            length: Tamanho da senha (entre 8 e 25 caracteres)
            complexity: 'baixa', 'media', 'alta'
        """
        if length < 8:
            raise ValueError("Senha deve ter no mínimo 8 caracteres")
        if length > 25:
            raise ValueError("Senha deve ter no máximo 25 caracteres")
        
        self.length = length
        self.complexity = complexity
        
    def gerar_senha(self) -> str:
        """
        Gera uma senha segura SEMPRE com:
        - Pelo menos 1 letra maiúscula
        - Pelo menos 1 letra minúscula
        - Pelo menos 1 número
        - Pelo menos 1 símbolo
        """
        
        simbolos_permitidos = "!@$%&*"
        
        # TODAS as complexidades garantem os 4 tipos
        senha = [
            secrets.choice(string.ascii_uppercase),  # 1 maiúscula
            secrets.choice(string.ascii_lowercase),  # 1 minúscula
            secrets.choice(string.digits),           # 1 número
            secrets.choice(simbolos_permitidos),     # 1 símbolo
        ]
        
        # Define conjunto de caracteres baseado na complexidade
        if self.complexity == "baixa":
            # Usa menos símbolos
            chars = string.ascii_letters + string.digits + "!@"
        elif self.complexity == "media":
            # Símbolos moderados
            chars = string.ascii_letters + string.digits + "!@$%"
        else:  # alta
            # Todos os símbolos
            chars = string.ascii_letters + string.digits + simbolos_permitidos
        
        # Completar o resto da senha
        senha.extend(secrets.choice(chars) for _ in range(self.length - 4))
        
        # Embaralhar de forma segura
        senha_list = list(senha)
        rng = secrets.SystemRandom()
        rng.shuffle(senha_list)
        
        return ''.join(senha_list)
    
    def gerar_multiplas(self, quantidade: int) -> list[str]:
        """Gera múltiplas senhas"""
        return [self.gerar_senha() for _ in range(quantidade)]


if __name__ == "__main__":
    print("="*60)
    print("TESTE DE GERAÇÃO DE SENHAS")
    print("="*60)
    
    # Teste com diferentes complexidades
    for complexity in ["baixa", "media", "alta"]:
        print(f"\n{'='*60}")
        print(f"Complexidade: {complexity.upper()}")
        print(f"{'='*60}")
        gerador = PasswordGenerator(length=12, complexity=complexity)
        
        for i in range(5):
            senha = gerador.gerar_senha()
            tem_numero = any(c.isdigit() for c in senha)
            tem_maiuscula = any(c.isupper() for c in senha)
            tem_minuscula = any(c.islower() for c in senha)
            tem_simbolo = any(c in "!@$%&*" for c in senha)
            
            # Verificar se TODOS os requisitos foram atendidos
            todos_ok = tem_numero and tem_maiuscula and tem_minuscula and tem_simbolo
            status = "✅" if todos_ok else "❌"
            
            print(f"\n  {status} Senha {i+1}: {senha}")
            print(f"      Maiúscula: {'✅' if tem_maiuscula else '❌'} | "
                  f"Minúscula: {'✅' if tem_minuscula else '❌'} | "
                  f"Número: {'✅' if tem_numero else '❌'} | "
                  f"Símbolo: {'✅' if tem_simbolo else '❌'}")
    
    print("\n" + "="*60)
    print("VALIDAÇÃO DE LIMITES")
    print("="*60)
    
    try:
        gerador = PasswordGenerator(length=7)
        print("❌ ERRO: Deveria ter dado erro com 7 caracteres")
    except ValueError as e:
        print(f"✅ {e}")
    
    try:
        gerador = PasswordGenerator(length=26)
        print("❌ ERRO: Deveria ter dado erro com 26 caracteres")
    except ValueError as e:
        print(f"✅ {e}")
    
    print("\n" + "="*60)
