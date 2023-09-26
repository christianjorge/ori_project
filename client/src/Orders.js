import * as React from 'react';
import Link from '@mui/material/Link';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Title from './Title';
import Axios from "axios";

function preventDefault(event) {
  event.preventDefault();
}

export default function Orders() {
  const [wordData, setWordData] = React.useState([]); 

  React.useEffect(() => {
    Axios.get("http://localhost:3001/indexador").then((response) => {
      setWordData(response.data);   
    });
  }, []);

  return (
    <React.Fragment>
      <Title>Frequência de Palavras</Title>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Palavra</TableCell>
            <TableCell>Frequência</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {wordData.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.word}</TableCell>
              <TableCell>{row.frequency}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Link color="primary" href="#" onClick={preventDefault} sx={{ mt: 3 }}>
        Ver mais
      </Link>
    </React.Fragment>
  );
}
