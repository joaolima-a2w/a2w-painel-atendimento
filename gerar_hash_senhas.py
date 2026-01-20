import bcrypt

senhas_plain = {
    'joao.pedro': 'Joao@123',     
    'antonio.carvalho': 'Joao@123',    
}

print("\n" + "="*60)
print("SENHAS EM HASH - COPIE E COLE NO usuarios.yaml")
print("="*60)

# Gera hash para cada senha
for usuario, senha in senhas_plain.items():
    hash_senha = bcrypt.hashpw(senha.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    print(f"\nUsuário: {usuario}")
    print(f"Senha: {senha}")
    print(f"Hash: {hash_senha}")

print("\n" + "="*60)
print("Copie os hashes acima e cole no arquivo usuarios.yaml")
print("="*60 + "\n")
