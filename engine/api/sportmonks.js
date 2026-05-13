const axios = require("axios");

const cache = require("./cache");

const BASE =
"https://api.sportmonks.com/v3/football";

async function sportmonks(endpoint){

  if(cache.has(endpoint)){

    return cache.get(endpoint);

  }

  const res = await axios.get(
    `${BASE}${endpoint}`,
    {
      params:{
        api_token:
        process.env.SPORTMONKS_API_KEY
      }
    }
  );

  cache.set(endpoint,res.data);

  return res.data;
}

module.exports = sportmonks;
