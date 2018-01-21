import express from 'express'
import expressGraphQl from 'express-graphql'
import schema from './schema';
import cors from 'cors';

const app = express();

app.use('/graphql', cors(), expressGraphQl({
  schema: schema,
  graphiql: true
})
)

app.listen(4000, ()=> {
  console.log('listening at 4000');
})
