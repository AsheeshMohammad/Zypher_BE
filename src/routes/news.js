import express from "express";
import fetch from "node-fetch";

const router = express.Router();

const NEWS_API_KEY = process.env.NEWS_API_KEY || "your_news_api_key_here";

router.get("/latest", async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  
  try {
    const categories = ['technology', 'business', 'health', 'sports', 'entertainment'];
    const allNews = [];
    
    for (const category of categories) {
      try {
        const response = await fetch(
          `https://newsapi.org/v2/top-headlines?category=${category}&language=en&pageSize=2&apiKey=${NEWS_API_KEY}`
        );
        
        if (response.ok) {
          const data = await response.json();
          const categoryNews = data.articles
            .filter(article => article.title && article.title !== '[Removed]')
            .map(article => ({
              title: article.title,
              description: article.description,
              url: article.url,
              source: article.source.name,
              publishedAt: article.publishedAt,
              category: category.toUpperCase()
            }));
          allNews.push(...categoryNews);
        }
      } catch (err) {
        console.error(`Error fetching ${category} news:`, err);
      }
    }
    
    allNews.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    
    const startIndex = (page - 1) * pageSize;
    const paginatedNews = allNews.slice(startIndex, startIndex + parseInt(pageSize));
    
    res.json({
      success: true,
      news: paginatedNews,
      totalResults: allNews.length
    });
  } catch (error) {
    console.error("News API error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch news"
    });
  }
});

router.get("/trending", async (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  
  try {
    const response = await fetch(
      `https://newsapi.org/v2/everything?q=trending&sortBy=popularity&language=en&pageSize=${pageSize}&page=${page}&apiKey=${NEWS_API_KEY}`
    );
    
    if (!response.ok) {
      throw new Error(`News API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    const formattedNews = data.articles
      .filter(article => article.title && article.title !== '[Removed]')
      .map(article => ({
        title: article.title,
        description: article.description,
        url: article.url,
        source: article.source.name,
        publishedAt: article.publishedAt,
        category: "TRENDING"
      }));
    
    res.json({
      success: true,
      news: formattedNews,
      totalResults: data.totalResults
    });
  } catch (error) {
    console.error("Trending news API error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch trending news"
    });
  }
});

export default router;