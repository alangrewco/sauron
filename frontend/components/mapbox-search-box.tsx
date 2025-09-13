'use client';

import { useEffect, useRef, useState } from 'react';
import { SearchBoxCore, SessionToken, SearchBoxSuggestion, SearchBoxRetrieveResponse } from '@mapbox/search-js-core';
import { cn } from '@/lib/utils';

interface MapboxSearchBoxProps {
  accessToken: string;
  onLocationSelect?: (coordinates: [number, number], placeName: string) => void;
  placeholder?: string;
  className?: string;
}

export default function MapboxSearchBox({
  accessToken,
  onLocationSelect,
  placeholder = "Search for a location...",
  className
}: MapboxSearchBoxProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchBoxSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const searchBox = useRef<SearchBoxCore | null>(null);
  const sessionToken = useRef<SessionToken | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchBox.current = new SearchBoxCore({
      accessToken,
      language: 'en',
      country: 'CA'
    });

    return () => {
      if (searchBox.current) {
        searchBox.current = null;
      }
    };
  }, [accessToken]);

  const handleInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);

    if (!value.trim() || !searchBox.current) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Generate a new session token for this search session
      sessionToken.current = new SessionToken();
      
      const suggestions = await searchBox.current.suggest(value, {
        sessionToken: sessionToken.current,
        limit: 5
      });
      
      setSuggestions(suggestions.suggestions);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching suggestions:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = async (suggestion: SearchBoxSuggestion) => {
    if (!searchBox.current || !sessionToken.current) return;

    try {
      setIsLoading(true);
      
      const result: SearchBoxRetrieveResponse = await searchBox.current.retrieve(suggestion, {
        sessionToken: sessionToken.current
      });

      if (result.features && result.features.length > 0) {
        const feature = result.features[0];
        const coordinates = feature.geometry.coordinates as [number, number];
        const placeName = feature.properties.name || feature.properties.place_formatted || suggestion.name;
        
        setQuery(placeName);
        setShowSuggestions(false);
        
        if (onLocationSelect) {
          onLocationSelect(coordinates, placeName);
        }
      }
    } catch (error) {
      console.error('Error retrieving location details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for click events
    setTimeout(() => {
      setShowSuggestions(false);
    }, 150);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onFocus={handleInputFocus}
        placeholder={placeholder}
        data-slot="input"
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive"
        )}
      />
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full" />
        </div>
      )}
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion.mapbox_id}-${index}`}
              className="w-full px-3 py-2 text-left hover:bg-muted/50 first:rounded-t-md last:rounded-b-md transition-colors"
              onClick={() => handleSuggestionClick(suggestion)}
              type="button"
            >
              <div className="font-medium text-sm">{suggestion.name}</div>
              {suggestion.place_formatted && (
                <div className="text-xs text-muted-foreground">{suggestion.place_formatted}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
