const footballApi =
require("../api/footballApi");

exports.getFixtures =
async(req,res)=>{

  try{

    const data =
    await footballApi(
      "/fixtures?live=all"
    );

    res.json(data.response || []);

  }catch(err){

    res.status(500).json({
      error:err.message
    });

  }

};
