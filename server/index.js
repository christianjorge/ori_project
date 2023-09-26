const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const app = express();
const stripHtmlTags = require('strip-html-tags');
const he = require('he');
const cors = require('cors');

const directoryPath = './uteis'; // Substitua pelo caminho do diretório contendo os arquivos .htm

app.use(cors());

app.get('/indexador', async (req, res) => {
  try {
    const wordFrequencyArray = [];

    const files = await fs.readdir(directoryPath);

    for (const file of files) {
      if (path.extname(file) === '.htm') {
        const content = await fs.readFile(path.join(directoryPath, file), 'utf-8');
        const textoSemHTML = he.decode(stripHtmlTags(content));
        const words = textoSemHTML.split(/\s+/);

        words.forEach((word) => {
          const cleanedWord = normalizarString(word);
          if (cleanedWord.length > 2) {
            const existingWord = wordFrequencyArray.find((item) => item.word === cleanedWord);
            if (existingWord) {
              existingWord.frequency += 1;
            } else {
              wordFrequencyArray.push({ word: cleanedWord, frequency: 1 });
            }
          }
        });
      }
    }
    wordFrequencyArray.sort((a,b) => b.frequency - a.frequency);
    //Gera arquivo:
    salvarJSONTemporario(wordFrequencyArray);

    res.json(wordFrequencyArray);
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Ocorreu um erro ao contar as palavras.' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});

function normalizarString(texto) {
    return texto
      .normalize('NFD') // Normaliza os caracteres acentuados para suas formas não acentuadas
      .replace(/[.,\/#.!\!$%\^&\*;:z\@\"\\?\!\[\]�{}=\-_`~()]/g, '') //Remover pontuação
      .replace(/<[^>]*>/g, '') //Remove as tags HTML
      .replace(/\d+/g, '') //Remove números
      .replace(/[\u0300-\u036f]/g, '') // Remove os caracteres acentuados (diacríticos)
      .toLowerCase(); // Converte para minúsculas
  }

  async function salvarJSONTemporario(json) {
    try {  
      // Crie um nome de arquivo temporário
      const nomeArquivo = 'indexedFile.json';
  
      // Caminho para o diretório temporário do sistema operacional
      const diretorioTemporario = './arquivos/';
  
      // Caminho completo do arquivo temporário
      const caminhoArquivoTemporario = path.join(diretorioTemporario, nomeArquivo);
  
      // Verifique se o arquivo já existe
      if (fs.existsSync(caminhoArquivoTemporario)) {
        // Se o arquivo existir, exclua-o
        fs.unlinkSync(caminhoArquivoTemporario);
        console.log(`Arquivo existente foi excluído: ${caminhoArquivoTemporario}`);
      }
  
      // Salve o JSON no arquivo temporário
      fs.writeFileSync(caminhoArquivoTemporario, JSON.stringify(json, null, 2));
      console.log(`JSON salvo em: ${caminhoArquivoTemporario}`);
    } catch (error) {
      console.error('Erro ao salvar JSON temporário:', error);
    }
  }