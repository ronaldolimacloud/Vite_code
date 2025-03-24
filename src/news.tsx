import { useEffect, useState } from "react";
import type { Schema } from "../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { Subscription } from "rxjs";
import ReactDOM from "react-dom/client";
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import "./index.css";
import "./App.css";
import React from "react";

Amplify.configure(outputs);

const client = generateClient<Schema>();

// Define the types
type NewsArticle = Schema["News"]["type"];
type Author = Schema["Author"]["type"];
type Publisher = Schema["Publisher"]["type"];

// Initial form state for a new article
const initialNewsForm = {
  title: "",
  body: "", // Text content
  image: "", // Featured image
  authorId: "",
  publisherId: "",
  authorName: "", // Temporary field for creating a new author
  publisherName: "", // Temporary field for creating a new publisher
};

function NewsApp() {
  const [authors, setAuthors] = useState<Author[]>([]);
  const [publishers, setPublishers] = useState<Publisher[]>([]);
  const [newsForm, setNewsForm] = useState(initialNewsForm);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newsModelAvailable, setNewsModelAvailable] = useState(false);
  const [authorModelAvailable, setAuthorModelAvailable] = useState(false);
  const [publisherModelAvailable, setPublisherModelAvailable] = useState(false);

  // Function to load article data for editing
  async function loadArticleForEditing(id: string) {
    if (!client.models.News) {
      console.error("News model is not available");
      return;
    }
    
    try {
      const result = await client.models.News.get({ id });
      if (result.data) {
        const article = result.data;
          
        setNewsForm({
          title: (article.title as string | undefined) ?? "",
          body: (article.body as string | undefined) ?? "",
          image: (article.image as string | undefined) ?? "",
          authorId: (article.authorId as string | undefined) ?? "",
          publisherId: (article.publisherId as string | undefined) ?? "",
          authorName: "", // Clear this as we're using authorId
          publisherName: "", // Clear this as we're using publisherId
        });
        setIsEditing(true);
        setEditingId(id);
      }
    } catch (error) {
      console.error("Error loading article for editing:", error);
    }
  }

  // Fetch news articles, authors, and publishers on component mount
  useEffect(() => {
    async function fetchData() {
      try {
        // Check if all necessary models are available
        const newsAvailable = !!client.models.News;
        const authorAvailable = !!client.models.Author;
        const publisherAvailable = !!client.models.Publisher;
        
        setNewsModelAvailable(newsAvailable);
        setAuthorModelAvailable(authorAvailable);
        setPublisherModelAvailable(publisherAvailable);
        
        if (newsAvailable) {
          // No need to fetch articles in this simplified version
        }
        
        if (authorAvailable) {
          const authorsResult = await client.models.Author.list({});
          setAuthors(authorsResult.data || []);
        }
        
        if (publisherAvailable) {
          const publishersResult = await client.models.Publisher.list({});
          setPublishers(publishersResult.data || []);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    }
    
    fetchData();
  }, []);

  function handleNewsFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setNewsForm(prev => ({ ...prev, [name]: value }));
  }

  async function handleNewsSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!client.models.News || !client.models.Author || !client.models.Publisher) {
      console.error("Models are not available");
      return;
    }
    
    try {
      // Handle author - either use existing or create new
      let authorId = newsForm.authorId;
      if (!authorId && newsForm.authorName) {
        // Create a new author
        const newAuthorResult = await client.models.Author.create({
          name: newsForm.authorName
        });
        if (newAuthorResult.data) {
          authorId = newAuthorResult.data.id;
        }
      }

      // Handle publisher - either use existing or create new
      let publisherId = newsForm.publisherId;
      if (!publisherId && newsForm.publisherName) {
        // Create a new publisher
        const newPublisherResult = await client.models.Publisher.create({
          name: newsForm.publisherName
        });
        if (newPublisherResult.data) {
          publisherId = newPublisherResult.data.id;
        }
      }
      
      // Prepare article data
      const articleData = {
        title: newsForm.title,
        body: newsForm.body, 
        image: newsForm.image,
        authorId,
        publisherId
      };
      
      if (isEditing && editingId) {
        // Update existing article
        await client.models.News.update({
          id: editingId,
          ...articleData
        });
      } else {
        // Create new article
        await client.models.News.create({
          ...articleData,
          created_at: new Date().toISOString()
        });
      }
      
      // Reset form
      setNewsForm(initialNewsForm);
      setIsEditing(false);
      setEditingId(null);
      
      // Redirect to articles page
      window.location.href = '/articles.html';
      
    } catch (error) {
      console.error("Error saving news article:", error);
    }
  }

  return (
    <main className="w-full">
      <header className="bg-white border-b border-gray-200 py-8">
        <h1 className="text-4xl font-bold text-center text-gray-800">News Portal</h1>
        <nav className="max-w-md mx-auto mt-6 flex justify-center">
          <a href="/news.html" className="flex items-center px-5 py-2 text-sm font-medium text-blue-600 border-b-2 border-blue-600">
            Create Articles
          </a>
          <a href="/articles.html" className="flex items-center px-5 py-2 text-sm font-medium text-gray-700 hover:text-blue-600">
            View Articles
          </a>
        </nav>
      </header>
      
      <div className="max-w-5xl mx-auto py-8 px-4">
        <h2 className="text-2xl font-semibold mb-6 text-gray-800">Create New Article</h2>
        
        {(!newsModelAvailable || !authorModelAvailable || !publisherModelAvailable) ? (
          <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700 mb-6">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-amber-400">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <p>One or more models are not available. Please check your Amplify configuration.</p>
            </div>
          </div>
        ) : (
          <>
            <form onSubmit={handleNewsSubmit} className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-medium mb-5 text-gray-700">{isEditing ? "Edit Article" : "Create New Article"}</h3>
              
              <div className="mb-5">
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">Title:</label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="title"
                    name="title"
                    value={newsForm.title}
                    onChange={handleNewsFormChange}
                    required
                    className="block w-full rounded-lg border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              
              {/* Text Content */}
              <div className="mb-5">
                <label htmlFor="textContent" className="block text-sm font-medium text-gray-700 mb-1">Text Content:</label>
                <div className="mt-1">
                  <textarea
                    id="textContent"
                    name="body"
                    value={newsForm.body}
                    onChange={handleNewsFormChange}
                    rows={6}
                    className="block w-full rounded-lg border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
                    placeholder="Enter the main content of your article here..."
                  />
                </div>
              </div>
              
              {/* Image URL */}
              <div className="mb-5">
                <label htmlFor="image" className="block text-sm font-medium text-gray-700 mb-1">Featured Image URL:</label>
                <div className="mt-1">
                  <input
                    type="text"
                    id="image"
                    name="image"
                    value={newsForm.image}
                    onChange={handleNewsFormChange}
                    className="block w-full rounded-lg border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                {newsForm.image && (
                  <div className="mt-3 p-3 border rounded-lg bg-white">
                    <p className="text-xs text-gray-500 mb-2">Preview:</p>
                    <img 
                      src={newsForm.image} 
                      alt="Preview" 
                      className="max-w-full h-auto max-h-48 rounded-md" 
                    />
                  </div>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="bg-white p-5 rounded-lg border border-gray-200">
                  <h4 className="text-base font-medium text-gray-700 mb-2">Author Information</h4>
                  <p className="text-sm text-gray-500 italic mb-4">
                    Select an existing author from the dropdown or leave it empty to create a new one.
                  </p>
                  
                  <div className="mb-4">
                    <label htmlFor="authorId" className="block text-sm font-medium text-gray-700 mb-1">Select Existing Author:</label>
                    <div className="mt-1 relative">
                      <select
                        id="authorId"
                        name="authorId"
                        value={newsForm.authorId}
                        onChange={handleNewsFormChange}
                        className="block w-full rounded-lg border-0 py-2 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="">-- Create new author --</option>
                        {authors.map(author => (
                          <option key={author.id} value={author.id}>
                            {author.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {!newsForm.authorId && (
                    <div className="mb-4">
                      <label htmlFor="authorName" className="block text-sm font-medium text-gray-700 mb-1">New Author Name:</label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="authorName"
                          name="authorName"
                          value={newsForm.authorName}
                          onChange={handleNewsFormChange}
                          placeholder="Enter name to create a new author"
                          required={!newsForm.authorId}
                          className="block w-full rounded-lg border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                      <p className="text-xs text-blue-600 mt-1">This will create a new author in the database</p>
                    </div>
                  )}
                </div>
                
                <div className="bg-white p-5 rounded-lg border border-gray-200">
                  <h4 className="text-base font-medium text-gray-700 mb-2">Publisher Information</h4>
                  <p className="text-sm text-gray-500 italic mb-4">
                    Select an existing publisher from the dropdown or leave it empty to create a new one.
                  </p>
                  
                  <div className="mb-4">
                    <label htmlFor="publisherId" className="block text-sm font-medium text-gray-700 mb-1">Select Existing Publisher:</label>
                    <div className="mt-1 relative">
                      <select
                        id="publisherId"
                        name="publisherId"
                        value={newsForm.publisherId}
                        onChange={handleNewsFormChange}
                        className="block w-full rounded-lg border-0 py-2 pl-3 pr-10 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
                      >
                        <option value="">-- Create new publisher --</option>
                        {publishers.map(publisher => (
                          <option key={publisher.id} value={publisher.id}>
                            {publisher.name}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  {!newsForm.publisherId && (
                    <div className="mb-4">
                      <label htmlFor="publisherName" className="block text-sm font-medium text-gray-700 mb-1">New Publisher Name:</label>
                      <div className="mt-1">
                        <input
                          type="text"
                          id="publisherName"
                          name="publisherName"
                          value={newsForm.publisherName}
                          onChange={handleNewsFormChange}
                          placeholder="Enter name to create a new publisher"
                          required={!newsForm.publisherId}
                          className="block w-full rounded-lg border-0 py-2 px-3 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-500 sm:text-sm"
                        />
                      </div>
                      <p className="text-xs text-blue-600 mt-1">This will create a new publisher in the database</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex mt-6">
                <button type="submit" className="inline-flex justify-center py-2 px-4 rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mr-3">
                  {isEditing ? "Update Article" : "Submit Article"}
                </button>
                
                {isEditing && (
                  <button 
                    type="button" 
                    className="inline-flex justify-center py-2 px-4 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400"
                    onClick={() => {
                      setNewsForm(initialNewsForm);
                      setIsEditing(false);
                      setEditingId(null);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
              
              {isEditing ? (
                <div className="mt-4 text-center">
                  <a 
                    href="/articles.html" 
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    ← Back to Articles
                  </a>
                </div>
              ) : (
                <div className="mt-6 p-4 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-sm text-blue-700 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-blue-400">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                    </svg>
                    After submitting, your article will be available on the <a href="/articles.html" className="font-medium underline">articles page</a>.
                  </p>
                </div>
              )}
            </form>
          </>
        )}
      </div>
    </main>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(<NewsApp />); 