const footballApi =
require("../api/footballApi");

exports.getStandings =
async(req,res)=>{

  try{

    const league =
    req.params.league;

    const data =
    await footballApi(
      `/standings?league=${league}&season=2025`
    );

    res.json(data.response || []);

  }catch(err){

    res.status(500).json({
      error:err.message
    });

  }

};
