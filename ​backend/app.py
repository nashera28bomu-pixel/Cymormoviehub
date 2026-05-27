import asyncio
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from moviebox_api.v1 import MovieAuto, Session, Search, SubjectType, MovieDetails, TVSeriesDetails, DownloadableMovieFilesDetail

app = FastAPI(title="Cymor Elite Scraper Engine v1.0")

# Allow internal requests from your Node.js server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/v1/scrape")
async def scrape_media(
    q: str = Query(..., description="Movie or TV Show title"),
    type: str = Query("movie", description="movie or tv"),
    s: int = 1,
    e: int = 1
):
    """
    10/10 Endpoint: Fetches high-speed stream links and subtitles
    """
    try:
        session = Session()
        
        # 1. Search for the content
        subject = SubjectType.MOVIES if type == "movie" else SubjectType.TV_SERIES
        search = Search(session, query=q, subject_type=subject)
        search_results = await search.get_content_model()
        
        if not search_results.first_item:
            raise HTTPException(status_code=404, detail="Content not found in MovieBox database")

        target = search_results.first_item

        # 2. Get Deep Details (Direct Media Links)
        if type == "movie":
            details_inst = MovieDetails(target, session)
        else:
            # For TV, we need to handle specific season/episode logic
            details_inst = TVSeriesDetails(target, session)
            
        details_model = await details_inst.get_content_model()

        # 3. Extract Downloadable/Streamable Files
        # Note: moviebox_api handles the 'handshake' to get real URLs
        download_logic = DownloadableMovieFilesDetail(session, details_model)
        files_detail = await download_logic.get_content_model()

        # 4. Construct 10/10 Response
        return {
            "success": True,
            "metadata": {
                "title": target.title if hasattr(target, 'title') else q,
                "type": type,
                "id": target.id if hasattr(target, 'id') else None
            },
            "stream": {
                "url": files_detail.best_media_file.url, # The direct ad-free link
                "quality": files_detail.best_media_file.quality,
                "size": files_detail.best_media_file.size
            },
            "subtitles": [
                {"lang": sub.language, "url": sub.url} 
                for sub in files_detail.captions 
                if sub.url
            ],
            "download_options": [
                {"quality": d.quality, "url": d.url, "size": d.size}
                for d in files_detail.downloads
            ]
        }

    except Exception as err:
        return {"success": False, "error": str(err)}

@app.get("/health")
async def health():
    return {"status": "online", "engine": "Cymor-MovieBox-V1"}

if __name__ == "__main__":
    import uvicorn
    # Port 5000 is standard for secondary services
    uvicorn.run(app, host="0.0.0.0", port=5000)
