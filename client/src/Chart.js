import * as React from 'react';
import { useTheme } from '@mui/material/styles';
import { LineChart, Line, XAxis, YAxis, Label, ResponsiveContainer } from 'recharts';
import Title from './Title';
import Axios from "axios";

export default function Chart() {
  const theme = useTheme();

  const [wordData, setWordData] = React.useState([]); 

  React.useEffect(() => {
    Axios.get('http://localhost:3001/indexador')
      .then((response) => {
        const data = response.data.map((item, index) => ({
          order: index + 1, // Ordem da palavra na lista
          frequency: item.frequency, // Frequência da palavra
        }));
        setWordData(data);
      })
      .catch((error) => {
        console.error('Erro ao carregar os dados:', error);
      });
  }, []);

  return (
    <React.Fragment>
      <Title>Frequência de Palavras</Title>
      <ResponsiveContainer>
        <LineChart
          data={wordData} // Use os dados carregados do arquivo JSON
          margin={{
            top: 16,
            right: 16,
            bottom: 0,
            left: 24,
          }}
        >
          <XAxis
            dataKey="word" // Use a chave "word" como dados para o eixo X
            stroke={theme.palette.text.secondary}
            style={theme.typography.body2}
          />
          <YAxis
            stroke={theme.palette.text.secondary}
            style={theme.typography.body2}
          >
            <Label
              angle={270}
              position="left"
              style={{
                textAnchor: 'middle',
                fill: theme.palette.text.primary,
                ...theme.typography.body1,
              }}
            >
              Frequência
            </Label>
          </YAxis>
          <Line
            isAnimationActive={false}
            type="monotone"
            dataKey="frequency" // Use a chave "frequency" como dados para o eixo Y
            stroke={theme.palette.primary.main}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </React.Fragment>
  );
}