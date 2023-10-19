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
const directoryPath = './uteis'; //Diretório contendo os arquivos .htm

const invertedIndex = {};

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Função para normalizar uma string (mesma função do código original)
function normalizarString(texto) {
  return texto
    .normalize('NFD')
    .replace(/[.,\/#.!\!$%\^&\*;:z\@\"\\?\!\[\]�{}=\-_`~()]/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/\d+/g, '')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

async function salvarJSONTemporario(json, nomeArquivo) {
  try {   
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

async function carregarIndiceInvertido() {
  try {
    const indexPath = './arquivos/invertedIndex.json';
    if (await fs.pathExists(indexPath)) {
      const jsonData = await fs.readFile(indexPath, 'utf-8');
      return JSON.parse(jsonData);
    } else {
      console.log('O arquivo de índice invertido não existe. Execute a rota /indexinverter primeiro.');
      return {};
    }
  } catch (error) {
    console.error('Erro ao carregar o índice invertido:', error);
    return {};
  }
}

async function carregarIndiceInvertidoPosicional() {
  try {
    const indexPath = './arquivos/positionalInvertedIndex.json';
    if (await fs.pathExists(indexPath)) {
      const jsonData = await fs.readFile(indexPath, 'utf-8');
      return JSON.parse(jsonData);
    } else {
      console.log('O arquivo de índice invertido posicional não existe. Execute a rota /indexinverter-posicional primeiro.');
      return {};
    }
  } catch (error) {
    console.error('Erro ao carregar o índice invertido posicional:', error);
    return {};
  }
}

app.get('/pesquisarposicional', async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Parâmetros de consulta ausentes.' });
  }

  // Carregar o índice invertido posicional do arquivo JSON
  const positionalInvertedIndex = await carregarIndiceInvertidoPosicional();

  const queryTerms = query.split(/\s+/);
  let currentOperator = ''; // Variável para rastrear o operador atual (AND, OR, NOT)
  let currentResults = []; // Variável para rastrear os resultados intermediários da consulta

  for (const term of queryTerms) {
    const termStemmed = stemmerRslp.stem(normalizarString(term)).toLowerCase();

    if (term === 'AND' || term === 'OR' || term === 'NOT') {
      // Configurar o operador atual com base na consulta
      currentOperator = term;
    } else {
      if (term.startsWith('/')) { //Consulta posicional
        
        // Processar pesquisa posicional
        const [proximity, nextTerm] = term.split('/');
        const maxProximity = parseInt(proximity);
        
        if (currentResults.length > 0) {
          const filteredDocuments = [];

          // Obter informações sobre os termos da consulta -- Debugar essa parte
          const termInfo1 = positionalInvertedIndex[termStemmed];
          const termInfo2 = positionalInvertedIndex[stemmerRslp.stem(normalizarString(nextTerm)).toLowerCase()];
          
          console.log(positionalInvertedIndex[termStemmed]);

          if (termInfo1 && termInfo2) {
            // Iterar pelos documentos
            for (const document in termInfo1.documents) {
              if (termInfo2.documents[document]) {
                const positions1 = termInfo1.documents[document];
                const positions2 = termInfo2.documents[document];

                const proximityPositions = [];

                // Comparar as posições e verificar a proximidade
                for (const position1 of positions1) {
                  for (const position2 of positions2) {
                    if (Math.abs(position1 - position2) <= maxProximity) {
                      proximityPositions.push(document);
                      break;
                    }
                  }
                }

                if (proximityPositions.length > 0) {
                  filteredDocuments.push(document);
                }
              }
            }
          }

          currentResults = filteredDocuments;
        } else {
          currentResults = [];
          break; // Interromper a consulta se não houver operador AND anterior
        }
      } else {
        // Consulta de termo único ou operador booleano (OR, NOT)
        if (positionalInvertedIndex[termStemmed]) {
          const termInfo = positionalInvertedIndex[termStemmed];

          if (currentOperator === 'AND') {
            if (currentResults.length === 0) {
              // Se não houver resultados intermediários, defina-os como os documentos deste termo
              currentResults = Object.keys(termInfo.documents);
            } else {
              // Caso contrário, filtre os documentos comuns
              currentResults = currentResults.filter((document) =>
                Object.keys(termInfo.documents).includes(document)
              );
            }
          } else if (currentOperator === 'OR') {
            // União dos resultados intermediários com os documentos deste termo
            currentResults = [...new Set([...currentResults, ...Object.keys(termInfo.documents)])];
          } else if (currentOperator === 'NOT') {
            // Filtrar documentos que não contêm este termo
            currentResults = currentResults.filter((document) =>
              !Object.keys(termInfo.documents).includes(document)
            );
          } else {
            // Definir os resultados intermediários como os documentos deste termo
            currentResults = Object.keys(termInfo.documents);
          }
        } else {
          // Se o termo não for encontrado, redefina os resultados intermediários como vazio e saia
          currentResults = [];
          break;
        }
      }
    }
  }

  res.json(currentResults);
});

app.get('/pesquisar', async (req, res) => {
  const { query } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Parâmetros de consulta ausentes.' });
  }

  // Carrega o índice invertido do arquivo JSON
  const invertedIndex = await carregarIndiceInvertido();

  const queryTerms = query.split(/\s+/);

  // Inicializa os resultados com todos os documentos
  let results = Object.keys(invertedIndex);

  // Função para aplicar o operador OR entre os resultados
  const performOR = (results, newResults) => {
    return [...new Set(results.concat(newResults))];
  };

  // Função para aplicar o operador AND entre os resultados
  const performAND = (results, newResults) => {
    return results.filter(result => newResults.includes(result));
  };

  // Função para aplicar o operador NOT aos resultados
  const performNOT = (results, notResults) => {
    return results.filter(result => !notResults.includes(result));
  };

  let currentOperator = '';
  let currentResults = [];

  for (const term of queryTerms) {
    const termStemmed = stemmerRslp.stem(normalizarString(term)).toLowerCase();

    if (term === 'AND' || term === 'OR' || term === 'NOT') {
      currentOperator = term;
    } else {
      if (invertedIndex[termStemmed]) {
        const termResults = invertedIndex[termStemmed];
        
        if (currentOperator === 'AND') {
          currentResults = performAND(currentResults, termResults);
        } else if (currentOperator === 'OR') {
          currentResults = performOR(currentResults, termResults);
        } else if (currentOperator === 'NOT') {
          currentResults = performNOT(currentResults, termResults);
        } else {
          currentResults = termResults;
        }
      } else {
        currentResults = [];
        break;
      }
    }
  }

  res.json(currentResults);
});

app.get('/indexinverter', async (req, res) => {
  try {
    const files = await fs.readdir(directoryPath);

    for (const file of files) {
      if (path.extname(file) === '.htm') {
        const content = await fs.readFile(path.join(directoryPath, file), 'utf-8');
        const textoSemHTML = he.decode(stripHtmlTags(content));
        const words = textoSemHTML.split(/\s+/);

        words.forEach((word) => {
          if (!stopwordsPt.includes(word.toLowerCase())) {
            const cleanedWord = normalizarString(word);
            if (cleanedWord.length > 2) {
              const stemmedWord = stemmerRslp.stem(cleanedWord);
              if (!invertedIndex[stemmedWord]) {
                invertedIndex[stemmedWord] = [];
              }
              if (!invertedIndex[stemmedWord].includes(file)) {
                invertedIndex[stemmedWord].push(file);
              }
            }
          }
        });
      }
    }

    // Gera arquivo JSON com o índice invertido
    salvarJSONTemporario(invertedIndex, 'invertedIndex.json');

    res.json(invertedIndex);
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Ocorreu um erro ao criar o índice invertido.' });
  }
});

app.get('/indexinverter-posicional', async (req, res) => {
  try {
    const files = await fs.readdir(directoryPath);
    const positionalIndex = {}; // Índice invertido posicional

    for (const file of files) {
      if (path.extname(file) === '.htm') {
        const content = await fs.readFile(path.join(directoryPath, file), 'utf-8');
        const textoSemHTML = he.decode(stripHtmlTags(content));
        const words = textoSemHTML.split(/\s+/);
        let position = 0; // Inicialize a posição

        words.forEach((word) => {
          if (!stopwordsPt.includes(word.toLowerCase())) {
            const cleanedWord = normalizarString(word);
            if (cleanedWord.length > 2) {
              const stemmedWord = stemmerRslp.stem(cleanedWord);

              // Verifique se o termo já existe no índice
              if (!positionalIndex[stemmedWord]) {
                positionalIndex[stemmedWord] = { documents: {}, totalOccurrences: 0 };
              }

              // Registre a posição de ocorrência
              if (!positionalIndex[stemmedWord].documents[file]) {
                positionalIndex[stemmedWord].documents[file] = [];
              }
              positionalIndex[stemmedWord].documents[file].push(position);

              // Atualize o total de ocorrências
              positionalIndex[stemmedWord].totalOccurrences++;

              // Atualize a posição
              position++;
            }
          }
        });
      }
    }

    // Gere um arquivo JSON com o índice invertido posicional
    salvarJSONTemporario(positionalIndex, 'positionalInvertedIndex.json');

    res.json(positionalIndex);
  } catch (error) {
    console.error('Erro:', error);
    res.status(500).json({ error: 'Ocorreu um erro ao criar o índice invertido posicional.' });
  }
});

app.get('/indexador', async (req, res) => {
  try {
    const wordFrequencyArray = [];

    const files = await fs.readdir(directoryPath);
    
    //Percorre o diretório
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
    salvarJSONTemporario(wordFrequencyArray, 'indexedFile.json');

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