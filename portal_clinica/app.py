import os
import sqlite3
import uuid
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Cria a pasta de uploads se não existir
if not os.path.exists("uploads"):
    os.makedirs("uploads")

# Função simples para conectar no banco SQLite
def conectar_banco():
    conn = sqlite3.connect("banco_clinica.db")
    conn.row_factory = sqlite3.Row
    return conn

# Cria a tabela na primeira vez que rodar
conn = conectar_banco()
conn.execute("""
    CREATE TABLE IF NOT EXISTS pacientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nome TEXT,
        cpf TEXT UNIQUE,
        nascimento TEXT,
        telefone TEXT,
        cep TEXT,
        rua TEXT,
        bairro TEXT,
        faltas INTEGER DEFAULT 0,
        qr_token TEXT,
        status_consulta TEXT DEFAULT 'Agendado'
    )
""")
conn.commit()
conn.close()

# Rota principal: entrega o arquivo index.html
@app.route("/")
def home():
    return send_from_directory(".", "index.html")

# Rota para entregar o CSS e o JS
@app.route("/<path:nome_arquivo>")
def arquivos_estaticos(nome_arquivo):
    return send_from_directory(".", nome_arquivo)

# Rota de Pré-Cadastro (Recebe dados + fotos)
@app.route("/cadastrar", methods=["POST"])
def cadastrar():
    nome = request.form.get("nome")
    cpf = request.form.get("cpf")
    nascimento = request.form.get("nascimento")
    telefone = request.form.get("telefone")
    cep = request.form.get("cep")
    rua = request.form.get("rua")
    bairro = request.form.get("bairro")
    
    # Gera um código único simples para o QR Code
    token = "UNICEUMA-" + str(uuid.uuid4())[:6].upper()

    # Salva as fotos na pasta uploads
    foto_rg = request.files.get("rg")
    foto_cpf = request.files.get("doc_cpf")
    if foto_rg:
        foto_rg.save(f"uploads/{cpf}_rg.jpg")
    if foto_cpf:
        foto_cpf.save(f"uploads/{cpf}_cpf.jpg")

    try:
        conn = conectar_banco()
        conn.execute("""
            INSERT INTO pacientes (nome, cpf, nascimento, telefone, cep, rua, bairro, qr_token)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (nome, cpf, nascimento, telefone, cep, rua, bairro, token))
        conn.commit()
        
        paciente = conn.execute("SELECT * FROM pacientes WHERE cpf = ?", (cpf,)).fetchone()
        conn.close()
        return jsonify(dict(paciente))
    except:
        return jsonify({"erro": "CPF já cadastrado!"}), 400

# Rota de Login
@app.route("/login", methods=["POST"])
def login():
    dados = request.json
    cpf = dados.get("cpf")
    nascimento = dados.get("nascimento")

    conn = conectar_banco()
    paciente = conn.execute(
        "SELECT * FROM pacientes WHERE cpf = ? AND nascimento = ?", 
        (cpf, nascimento)
    ).fetchone()
    conn.close()

    if paciente:
        return jsonify(dict(paciente))
    else:
        return jsonify({"erro": "CPF ou data de nascimento inválidos"}), 401

# Rota para Confirmar ou Cancelar consulta
@app.route("/atualizar_consulta", methods=["POST"])
def atualizar_consulta():
    dados = request.json
    cpf = dados.get("cpf")
    novo_status = dados.get("status")

    conn = conectar_banco()
    conn.execute("UPDATE pacientes SET status_consulta = ? WHERE cpf = ?", (novo_status, cpf))
    conn.commit()
    conn.close()
    return jsonify({"mensagem": "Atualizado com sucesso!"})

if __name__ == "__main__":
    app.run(debug=True, port=5000)