import {GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLInt} from 'graphql';
import fetch from 'isomorphic-fetch';
import countries from './sources';
import {newsKey, yandexKey} from './credentials';

// topheads:  https://newsapi.org/v2/top-headlines?country=us&apiKey=${newsKey}
const returnFetchPromise = (country) => fetch(`https://newsapi.org/v2/top-headlines?pageSize=1&country=${country}&apiKey=${newsKey}`).then(data => data.json())
/*
const loadArticles = () => {
  let news = [];
  let i = 0
  return new Promise((resolve, reject) => {
    return countries.map(returnFetchPromise).reduce((sequence, promise) => {
      return sequence.then(() => {

        return promise
      }).then(parsed => {
        // if I could send to client individually this woulbe possibly be the place
        news.push({src: parsed.articles[0].source.id, title: parsed.articles[0].title, description: parsed.articles[0].description, url: parsed.articles[0].url})
        if (parsed.articles[0].source.id === countries.slice(-1)[0])
          resolve(news);
        }
      ).catch(err => console.log("We've had a rejection ...", err))
    }, Promise.resolve())
  })
}
*/

let articles = [];
const loadArticles = () => {
  return Promise.all(countries.map(returnFetchPromise)).then(data => {
    data = data.map(parsed => {

      return {
        src: parsed.articles[0].source.name,
        title: parsed.articles[0].title,
        description: parsed.articles[0].description,
        url: parsed.articles[0].url,
        urlToImage: parsed.articles[0].urlToImage}
    });
    articles = data
    console.log(articles);
  })
}

setInterval(() => {
  loadArticles()
}, 60000)
loadArticles()

const loadArticle = (country) => {
  return returnFetchPromise(country).then(parsed => {
    return {
      src: parsed.articles[0].source.name,
      title: parsed.articles[0].title,
      description: parsed.articles[0].description,
      url: parsed.articles[0].url,
      urlToImage: parsed.articles[0].urlToImage,
      country: country
    }
  });
}

const allSourcesInLanguage = (lang) => {
  return fetch(`https://newsapi.org/v2/sources?language=${lang}&apiKey=${newsKey}`).then(data => data.json()).then(data => {
    let sources = []
    data.sources.forEach(src => {
      sources.push(src.id)
    })
    return sources
  })
}


const translate = (text, srcLang) => {
  text = encodeURIComponent(text)
  return fetch(`https://translate.yandex.net/api/v1.5/tr.json/translate?key=${yandexKey}&text=${text}&lang=${srcLang}-en`).then(res => res.json()).then(parsed => {
    return parsed.text[0]
  })
}

const ArticleType = new GraphQLObjectType({
  name: 'Article',
  fields: () => ({
    src: {
      type: GraphQLString
    },
    title: {
      type: GraphQLString
    },
    description: {
      type: GraphQLString
    },
    url: {
      type: GraphQLString
    },
    urlToImage: {
      type: GraphQLString
    },
    country: {
      type: GraphQLString
    }
  })
});
const TranslateType = new GraphQLObjectType({
  name: 'Translate',
  fields: () => ({
    title: {
      type: GraphQLString
    },
    description: {
      type: GraphQLString
    },
    lang: {
      type: GraphQLString
    }
  })
});

const query = new GraphQLObjectType({
  name: 'Query',
  fields: {
    article: {
      type: ArticleType,
      args: {
        country: {
          type: GraphQLString
        }
      },
      resolve(parentValue, args) {
        return loadArticle(args.country)
      }
    },
    articles: {
      type: new GraphQLList(ArticleType),
      resolve(parentValue, args) {
        return articles || loadArticles().then(news => news)
      }
    },

    translate: {
      type: TranslateType,
      args: {
        description: {
          type: GraphQLString
        },
        title: {
          type: GraphQLString
        },
        lang: {
          type: GraphQLString
        }
      },
      resolve(parentValue, args) {

        const result = {}
        return translate(args.description, args.lang).then(res => {
          result.description = res;
          result.lang = args.lang;
        }).then(() => {
          return translate(args.title, args.lang).then(res => {
            result.title = res;
          //  console.log(result);
            return result
          })
        })
      }
    }
  }
})

module.exports = new GraphQLSchema({query: query})
