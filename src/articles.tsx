import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { Subscription } from "rxjs";
import ReactDOM from "react-dom/client";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import "./index.css";
import "./App.css";

Amplify.configure(outputs);

const client = generateClient<Schema>();

// Define the types
type NewsArticle = Schema["News"]["type"];
type Author = Schema["Author"]["type"];
type Publisher = Schema["Publisher"]["type"];

// Define content block types for rendering
type ContentBlockType = "text" | "image" | "video";

interface ContentBlock {
  id: string;
  type: ContentBlockType;
  content: string;
  caption?: string;
  alignment?: "left" | "center" | "right" | "full";
}

function ArticlesPage() {
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [authors, setAuthors] = useState<Author[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [newsModelAvailable, setNewsModelAvailable] = useState(false);
  const [authorModelAvailable, setAuthorModelAvailable] = useState(false);
  const [publisherModelAvailable, setPublisherModelAvailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  useEffect(() => {
    // Check if models are available
    setNewsModelAvailable(!!client.models.News);
    setAuthorModelAvailable(!!client.models.Author);
    setPublisherModelAvailable(!!client.models.Publisher);

    // Subscribe to News changes if the model exists
    let newsSubscription: Subscription | undefined;
    if (client.models.News) {
      newsSubscription = client.models.News.observeQuery().subscribe({
        next: (data) => {
          setNewsArticles([...data.items]);
          setIsLoading(false);
        },
        error: (error) => {
          console.error("Error subscribing to News changes:", error);
          setErrorMessage(`Failed to load articles: ${error instanceof Error ? error.message : "Unknown error"}`);
          setIsLoading(false);
        }
      });
    } else {
      setIsLoading(false);
    }

    // Load authors
    async function loadAuthors() {
      if (client.models.Author) {
        try {
          const authorResult = await client.models.Author.list();
          setAuthors(authorResult.data);
        } catch (error) {
          console.error("Error loading authors:", error);
          setErrorMessage(`Error loading authors: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    }
    
    // Load publishers
    async function loadPublishers() {
      if (client.models.Publisher) {
        try {
          const publisherResult = await client.models.Publisher.list();
          setPublishers(publisherResult.data);
        } catch (error) {
          console.error("Error loading publishers:", error);
          setErrorMessage(`Error loading publishers: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
      }
    }

    loadAuthors();
    loadPublishers();

    // Cleanup subscriptions
    return () => {
      if (newsSubscription) newsSubscription.unsubscribe();
    };
  }, []);

  async function deleteNewsArticle(id: string) {
    if (!client.models.News) {
      console.error("News model is not available");
      setErrorMessage("Unable to delete: News model is not available");
      return;
    }
    
    if (window.confirm("Are you sure you want to delete this article?")) {
      try {
        setIsDeleting(id);
        await client.models.News.delete({ id });
        // The subscription will handle updating the UI
      } catch (error) {
        console.error("Error deleting article:", error);
        setErrorMessage(`Failed to delete article: ${error instanceof Error ? error.message : "Unknown error"}`);
      } finally {
        setIsDeleting(null);
      }
    }
  }

  // Helper function to find author or publisher name by ID
  function getAuthorName(authorId?: string) {
    if (!authorId) return "Unknown";
    const author = authors.find(a => a.id === authorId);
    return author?.name || "Unknown";
  }
  
  function getPublisherName(publisherId?: string) {
    if (!publisherId) return "";
    const publisher = publishers.find(p => p.id === publisherId);
    return publisher?.name || "";
  }

  // Parse content blocks from JSON string
  const parseBlocks = (jsonString?: string): ContentBlock[] => {
    if (!jsonString) return [];
    try {
      return JSON.parse(jsonString) as ContentBlock[];
    } catch (e) {
      console.error("Error parsing blocks:", e);
      return [];
    }
  };

  // Check if content is a markdown-style image
  const isMarkdownImage = (content: string): { isImage: boolean, url: string, alt: string } => {
    const regex = /!\[(.*?)\]\((.*?)\)/;
    const match = content.match(regex);
    
    if (match) {
      return { 
        isImage: true, 
        url: match[2], 
        alt: match[1] || 'Article image'
      };
    }
    
    return { isImage: false, url: '', alt: '' };
  };

  // Safely render YouTube/Vimeo URLs as embedded iframes
  const getEmbedUrl = (url: string): string => {
    try {
      // YouTube
      if (url.includes('youtube.com') || url.includes('youtu.be')) {
        const videoId = url.includes('v=') 
          ? new URL(url).searchParams.get('v')
          : url.split('/').pop();
        return `https://www.youtube.com/embed/${videoId}`;
      }
      // Vimeo
      else if (url.includes('vimeo.com')) {
        const videoId = url.split('/').pop();
        return `https://player.vimeo.com/video/${videoId}`;
      }
      return url;
    } catch (e) {
      return url;
    }
  };

  // Component to render content blocks
  const ArticleContent = ({ article }: { article: NewsArticle }) => {
    // Check if the body needs special handling for markdown-style images
    const bodyContent = article.body as string;
    
    if (!bodyContent) {
      return <div className="prose">No content</div>;
    }
    
    // First try to parse as JSON for structured content blocks
    const contentBlocks = parseBlocks(bodyContent);
    
    // If no content blocks, render with markdown image support
    if (contentBlocks.length === 0) {
      // Split by lines to handle markdown images
      const lines = bodyContent.split('\n');
      
      return (
        <div className="prose">
          {lines.map((line, idx) => {
            const imageCheck = isMarkdownImage(line);
            
            if (imageCheck.isImage) {
              return (
                <div key={idx} className="my-4 flex justify-center">
                  <img 
                    src={imageCheck.url} 
                    alt={imageCheck.alt} 
                    className="max-w-full h-auto rounded-md shadow-sm" 
                    loading="lazy"
                  />
                </div>
              );
            }
            
            // If not an image, render as text with line breaks
            return (
              <div key={idx} className="my-1">
                {line || <br />}
              </div>
            );
          })}
        </div>
      );
    }
    
    // If it's a structured content, use the original rendering
    return (
      <div className="space-y-6">
        {contentBlocks.map((block, index) => (
          <div key={block.id || index} className="mb-4">
            {block.type === 'text' && (
              <div className="text-gray-600 whitespace-pre-line">{block.content}</div>
            )}
            
            {block.type === 'image' && block.content && (
              <div className={`
                ${block.alignment === 'left' ? 'mr-auto' : 
                  block.alignment === 'right' ? 'ml-auto' : 
                  block.alignment === 'center' ? 'mx-auto' : 'w-full'}
                ${block.alignment !== 'full' ? 'max-w-[70%]' : ''}
              `}>
                <img 
                  src={block.content} 
                  alt={block.caption || 'Article image'} 
                  className="max-w-full h-auto rounded-md" 
                />
                {block.caption && (
                  <p className="text-sm text-gray-500 italic mt-1">{block.caption}</p>
                )}
              </div>
            )}
            
            {block.type === 'video' && block.content && (
              <div className={`
                ${block.alignment === 'center' ? 'mx-auto max-w-[80%]' : 'w-full'}
                aspect-video
              `}>
                <iframe
                  src={getEmbedUrl(block.content)}
                  className="w-full h-full rounded-md"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                ></iframe>
                {block.caption && (
                  <p className="text-sm text-gray-500 italic mt-1">{block.caption}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <main className="w-full">
      <header className="bg-white border-b border-gray-200 py-8">
        <h1 className="text-4xl font-bold text-center text-gray-800">News Portal</h1>
        <nav className="max-w-md mx-auto mt-6 flex justify-center">
          <a href="/news.html" className="flex items-center px-5 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
            Create Articles
          </a>
          <a href="/articles.html" className="flex items-center px-5 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
            View Articles
          </a>
        </nav>
      </header>
      
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-semibold text-gray-800">Published Articles</h2>
        </div>
        
        {/* Error message display */}
        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-red-500">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
              </svg>
              <p>{errorMessage}</p>
              <button 
                onClick={() => setErrorMessage(null)} 
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          </div>
        )}
        
        {(!newsModelAvailable || !authorModelAvailable || !publisherModelAvailable) ? (
          <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700 mb-6">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-amber-400">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <p>One or more models are not available. Please check your Amplify configuration.</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="text-center py-16 px-4 bg-white border border-gray-200 rounded-lg">
            <div className="flex justify-center">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <p className="mt-4 text-gray-600">Loading articles...</p>
          </div>
        ) : (
          <>
            {newsArticles.length === 0 ? (
              <div className="text-center py-16 px-4 bg-white border border-gray-200 rounded-lg">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No articles yet</h3>
                <p className="mt-1 text-sm text-gray-500">Go to the create page to publish your first article</p>
                <div className="mt-6">
                  <a href="/news.html" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700">
                    <svg className="-ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v2.5h-2.5a.75.75 0 000 1.5h2.5v2.5a.75.75 0 001.5 0v-2.5h2.5a.75.75 0 000-1.5h-2.5v-2.5z" clipRule="evenodd" />
                    </svg>
                    Create New Article
                  </a>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {newsArticles.map((article) => (
                  <div key={article.id} className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    {article.image && (
                      <div className="w-full h-56 overflow-hidden">
                        <img 
                          src={article.image as string}
                          alt={article.title as string}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    
                    <div className="p-6">
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">{article.title}</h3>
                      <div className="flex items-center text-sm text-gray-500 mb-5">
                        <span className="flex items-center">
                          <svg className="mr-1.5 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                          </svg>
                          {getAuthorName(article.authorId as string)}
                        </span>
                        {article.publisherId && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="flex items-center">
                              <svg className="mr-1.5 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a1 1 0 01-1.581.814l-4.419-3.535-4.419 3.535A1 1 0 014 16V4z" clipRule="evenodd" />
                              </svg>
                              {getPublisherName(article.publisherId as string)}
                            </span>
                          </>
                        )}
                        {article.created_at && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="flex items-center">
                              <svg className="mr-1.5 h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                              </svg>
                              {new Date(article.created_at as string).toLocaleDateString()}
                            </span>
                          </>
                        )}
                      </div>
                      
                      <div className="mb-6 prose prose-gray max-w-none max-h-36 overflow-hidden relative">
                        <ArticleContent article={article} />
                        <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent"></div>
                      </div>
                    </div>
                    
                    <div className="flex border-t border-gray-200 divide-x divide-gray-200">
                      <a 
                        href={`/news.html?edit=${article.id}`} 
                        className="flex-1 flex items-center justify-center py-3 text-sm font-medium text-gray-600 hover:text-blue-600 hover:bg-gray-50"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Edit
                      </a>
                      <button 
                        onClick={() => deleteNewsArticle(article.id)} 
                        disabled={isDeleting === article.id}
                        className="flex-1 flex items-center justify-center py-3 text-sm font-medium text-gray-600 hover:text-red-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isDeleting === article.id ? (
                          <>
                            <svg className="animate-spin h-5 w-5 mr-1.5 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Delete
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<ArticlesPage />); 