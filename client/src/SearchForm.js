import React, { useState } from 'react';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Title from './Title';
import axios from 'axios';

function SearchForm({ onSearch }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const handleSearch = () => {
    axios.get(`http://localhost:3001/pesquisarvetorial?query=${searchTerm}`)
      .then(response => {
        setSearchResults(response.data);
      })
      .catch(error => {
        console.error('Erro na pesquisa:', error);
      });
  };

  return (
    <>
      <div style={{ display: 'flex', marginBottom: '16px' }}>
        <TextField
          label="Digite o termo de pesquisa"
          variant="outlined"
          fullWidth
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button
          variant="contained"
          color="primary"
          onClick={handleSearch}
          style={{ marginLeft: '8px' }}
        >
          Pesquisar
        </Button>
      </div>
      {searchResults.length > 0 && (
        <>
          <Title>Retorno da Pesquisa</Title>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Nome do Documento</TableCell>
                <TableCell>Similaridade</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {searchResults.map((result, index) => (
                <TableRow key={index}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <a
                      href={`http://localhost:3001/${result.documento}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {result.documento}
                    </a>
                  </TableCell>
                  <TableCell>
                    {result.similarity !== 0 ? (
                      <>
                        {result.similarity}
                      </>
                      ) : (
                        "Irrelevante"
                      )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </>
      )}
    </>
  );
}

export default SearchForm;
