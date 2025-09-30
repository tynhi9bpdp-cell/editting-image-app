import React, { useState, useCallback } from 'react';
import { editImage } from './services/geminiService';
import { fileToBase64 } from './utils/fileUtils';
import Header from './components/Header';
import ImageUploader from './components/ImageUploader';
import ImageDisplay from './components/ImageDisplay';
import Loader from './components/Loader';
import ErrorAlert from './components/ErrorAlert';
import { MagicWandIcon, DownloadIcon, TrashIcon, XIcon } from './components/icons';

interface UploadedImage {
    id: string;
    file: File;
    url: string;
}

const App: React.FC = () => {
    const [originalImages, setOriginalImages] = useState<UploadedImage[]>([]);
    const [editedImage, setEditedImage] = useState<{ url: string; responseText: string } | null>(null);
    const [prompt, setPrompt] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    const handleImagesChange = (files: FileList) => {
        const newImages = Array.from(files).map(file => ({
            file,
            url: URL.createObjectURL(file),
            id: `${file.name}-${Date.now()}`
        }));
        setOriginalImages(prev => [...prev, ...newImages]);
        setError(null);
    };

    const handleRemoveImage = (idToRemove: string) => {
        setOriginalImages(prev => prev.filter(img => img.id !== idToRemove));
    };

    const handleSubmit = useCallback(async (event: React.FormEvent) => {
        event.preventDefault();
        if (originalImages.length === 0 || !prompt || isLoading) return;

        setIsLoading(true);
        setError(null);
        setEditedImage(null);

        try {
            const imageParts = await Promise.all(
                originalImages.map(img => fileToBase64(img.file))
            );
            
            const result = await editImage(imageParts, prompt);

            if (result.imageData) {
                const originalName = originalImages[0]?.file.name || 'image.png';
                setEditedImage({
                    url: `data:${result.mimeType || 'image/png'};base64,${result.imageData}`,
                    responseText: result.textData
                });
            } else {
                // Handle text-only response: show the text and an error.
                setEditedImage({ url: '', responseText: result.textData }); // Set the text to be displayed
                setError("The model returned a text response but no image. Please adjust your prompt.");
            }

        } catch (err) {
            console.error(err);
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoading(false);
        }
    }, [originalImages, prompt, isLoading]);
    
    const handleStartOver = useCallback(() => {
        setOriginalImages([]);
        setEditedImage(null);
        setPrompt('');
        setError(null);
        setIsLoading(false);
    }, []);

    return (
        <div className="min-h-screen bg-brand-bg font-sans text-brand-text">
            <Header />
            <main className="p-4 sm:p-6 lg:p-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-7xl mx-auto">
                    {/* Control Panel */}
                    <div className="bg-brand-surface rounded-xl shadow-lg p-6 flex flex-col space-y-6 h-fit">
                        <h2 className="text-2xl font-bold text-brand-primary">1. Upload & Describe</h2>
                        <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
                            <ImageUploader onImagesChange={handleImagesChange} />

                            {originalImages.length > 0 && (
                                <div>
                                    <h3 className="text-sm font-medium text-brand-text-secondary mb-2">Source Images:</h3>
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                        {originalImages.map(image => (
                                            <div key={image.id} className="relative group">
                                                <img src={image.url} alt="upload preview" className="w-full aspect-square object-cover rounded-md" />
                                                <button 
                                                    type="button"
                                                    onClick={() => handleRemoveImage(image.id)}
                                                    className="absolute top-1 right-1 bg-black/50 hover:bg-black/80 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                    aria-label="Remove image"
                                                >
                                                    <XIcon className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div>
                                <label htmlFor="prompt" className="block text-sm font-medium text-brand-text-secondary mb-2">Editing Instructions:</label>
                                <textarea
                                    id="prompt"
                                    value={prompt}
                                    onChange={(e) => setPrompt(e.target.value)}
                                    placeholder="Be descriptive! Refer to images by their content. e.g., 'Replace the shirt on the person in the portrait with the blue shirt from the other image.'"
                                    className="w-full h-32 p-3 bg-brand-bg border border-brand-secondary rounded-lg focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition duration-200"
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="flex items-center space-x-4">
                                <button
                                    type="submit"
                                    disabled={originalImages.length === 0 || !prompt || isLoading}
                                    className="flex-grow flex items-center justify-center bg-brand-primary hover:bg-blue-500 disabled:bg-brand-secondary disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition duration-300 transform hover:scale-105 disabled:scale-100"
                                >
                                    {isLoading ? (
                                        <Loader />
                                    ) : (
                                        <>
                                            <MagicWandIcon className="w-5 h-5 mr-2" />
                                            Generate Edit
                                        </>
                                    )}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleStartOver}
                                    className="p-3 bg-brand-secondary hover:bg-gray-500 text-white rounded-lg transition duration-300"
                                    aria-label="Start Over"
                                    title="Start Over"
                                >
                                    <TrashIcon className="w-6 h-6" />
                                </button>
                            </div>
                        </form>
                        {error && <ErrorAlert message={error} />}
                    </div>

                    {/* Results Panel */}
                    <div className="bg-brand-surface rounded-xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-brand-primary mb-6">2. View Result</h2>
                        <div className="flex flex-col">
                           <ImageDisplay title="After" imageUrl={editedImage?.url} isLoading={isLoading} />
                           {editedImage && editedImage.url && !isLoading && (
                                <a
                                    href={editedImage.url}
                                    download={`edited-${originalImages[0]?.file.name || 'image.png'}`}
                                    className="mt-4 w-full flex items-center justify-center bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition duration-300"
                                    aria-label="Download edited image"
                                >
                                    <DownloadIcon className="w-5 h-5 mr-2" />
                                    Download
                                </a>
                            )}
                        </div>
                        {editedImage?.responseText && (
                            <div className="mt-6 p-4 bg-brand-bg rounded-lg">
                               <h3 className="font-semibold text-brand-text-secondary mb-2">Model's Note:</h3>
                               <p className="text-sm italic">"{editedImage.responseText}"</p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default App;