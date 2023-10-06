const express = require('express');
const fs = require('fs-extra'); //Biblioteca para trabalhar com diretórios.
const path = require('path');
const app = express();
const stripHtmlTags = require('strip-html-tags'); //Biblioteca pra remover tags html.
const he = require('he');
const cors = require('cors'); //Para evitar problema de requisição para o mesmo localhost.
const stopwordsPt = require('stopwords-pt'); //Biblioteca pra remover stop words.
const natural = require('natural'); //Biblioteca para radicalizar palavras
const stemmerRslp = natural.PorterStemmerPt;

const directoryPath = './uteis'; // Substitua pelo caminho do diretório contendo os arquivos .htm

app.use(cors());

// Crie um stemmer RSLP


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
          // Remove stopwords
          if (!stopwordsPt.includes(word.toLowerCase())) {
            // Limpa a palavra
            const cleanedWord = normalizarString(word);
            // Verifica se o tamanho é maior que 2
            if (cleanedWord.length > 2) {
              // Aplicar o RSLP Stemmer à palavra
              const stemmedWord = stemmerRslp.stem(cleanedWord);
        
              // Verifica se a palavra radicalizada já existe no array resultante, caso sim, soma a frequência.
              const existingWord = wordFrequencyArray.find((item) => item.word === stemmedWord);
        
              if (existingWord) {
                existingWord.frequency += 1;
              } else {
                wordFrequencyArray.push({ word: stemmedWord, frequency: 1 });
              }
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