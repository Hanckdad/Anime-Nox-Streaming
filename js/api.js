// API Configuration dengan Fallback System
class AnimeAPI {
    constructor() {
        this.baseURL = 'https://www.sankavollerei.com/anime';
        this.fallbackAPIs = [
            'https://api.otakudesu.moe',
            'https://api.samehadaku.vip',
            'https://api.animeapi.com'
        ];
        this.currentAPI = 0;
        this.retryCount = 0;
        this.maxRetries = 3;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    // Cache management
    setCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    getCache(key) {
        const item = this.cache.get(key);
        if (item && Date.now() - item.timestamp < this.cacheTimeout) {
            return item.data;
        }
        this.cache.delete(key);
        return null;
    }

    // Generic request method dengan fallback dan retry
    async request(endpoint, options = {}) {
        const cacheKey = `${endpoint}-${JSON.stringify(options)}`;
        const cached = this.getCache(cacheKey);
        if (cached) {
            console.log(`Cache hit: ${endpoint}`);
            return cached;
        }

        const urls = [
            `${this.baseURL}${endpoint}`,
            ...this.fallbackAPIs.map(api => `${api}${endpoint}`)
        ];

        for (let i = this.currentAPI; i < urls.length; i++) {
            try {
                console.log(`Trying API ${i}: ${urls[i]}`);
                
                const response = await fetch(urls[i], {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'AnimeNox/1.0.0',
                        ...options.headers
                    },
                    timeout: 10000
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const data = await response.json();
                
                // Cache the successful response
                this.setCache(cacheKey, data);
                this.currentAPI = i;
                this.retryCount = 0;
                
                console.log(`API ${i} success:`, data);
                return data;
                
            } catch (error) {
                console.warn(`API ${i} failed:`, error.message);
                
                if (i === urls.length - 1 && this.retryCount < this.maxRetries) {
                    this.retryCount++;
                    console.log(`Retrying... (${this.retryCount}/${this.maxRetries})`);
                    i = -1; // Restart from first API
                    await this.delay(1000 * this.retryCount);
                } else if (i === urls.length - 1) {
                    throw new Error('All APIs failed after retries');
                }
            }
        }
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Home page data dengan multiple sources
    async getHome() {
        try {
            // Coba API utama dulu
            const homeData = await this.request('/anime/home');
            return this.transformHomeData(homeData);
        } catch (error) {
            console.warn('Home API failed, using fallback data:', error);
            
            // Fallback: Ambil data dari berbagai endpoint
            const [trending, ongoing, latest, complete, schedule] = await Promise.allSettled([
                this.getTrending(),
                this.getOngoing(),
                this.getLatestEpisodes(),
                this.getComplete(1),
                this.getSchedule()
            ]);

            return {
                trending: trending.status === 'fulfilled' ? trending.value.slice(0, 8) : [],
                ongoing: ongoing.status === 'fulfilled' ? ongoing.value.slice(0, 8) : [],
                latest: latest.status === 'fulfilled' ? latest.value.slice(0, 6) : [],
                complete: complete.status === 'fulfilled' ? complete.value.slice(0, 8) : [],
                schedule: schedule.status === 'fulfilled' ? schedule.value : {},
                movies: [] // Will be populated separately
            };
        }
    }

    // Transform home data dari berbagai format API
    transformHomeData(data) {
        // Handle berbagai format response dari API yang berbeda
        if (data.trending && data.ongoing && data.latest) {
            return data;
        }
        
        if (data.popular && data.recent && data.schedule) {
            return {
                trending: data.popular,
                ongoing: data.ongoing || data.popular,
                latest: data.recent,
                schedule: data.schedule,
                complete: data.complete || []
            };
        }
        
        // Default transformation
        return {
            trending: data.popular || data.trending || data.results || [],
            ongoing: data.ongoing || data.current || [],
            latest: data.recent || data.latest || data.episodes || [],
            schedule: data.schedule || {},
            complete: data.complete || data.finished || []
        };
    }

    // Trending anime dari multiple sources
    async getTrending() {
        try {
            // Coba dari Otakudesu API
            const data = await this.request('/anime/unlimited?sort=popular&limit=20');
            return this.normalizeAnimeList(data.anime || data.results || []);
        } catch (error) {
            console.warn('Trending API failed, trying alternatives:', error);
            
            // Fallback ke Samehadaku popular
            try {
                const data = await this.request('/anime/samehadaku/popular');
                return this.normalizeAnimeList(data.anime || data.results || []);
            } catch (error2) {
                console.error('All trending APIs failed:', error2);
                return this.getFallbackTrending();
            }
        }
    }

    // Ongoing anime
    async getOngoing() {
        try {
            const data = await this.request('/anime/ongoing-anime');
            return this.normalizeAnimeList(data.anime || data.results || []);
        } catch (error) {
            console.warn('Ongoing API failed, trying alternatives:', error);
            
            try {
                const data = await this.request('/anime/samehadaku/ongoing');
                return this.normalizeAnimeList(data.anime || data.results || []);
            } catch (error2) {
                console.error('All ongoing APIs failed:', error2);
                return this.getFallbackOngoing();
            }
        }
    }

    // Complete anime
    async getComplete(page = 1) {
        try {
            const data = await this.request(`/anime/complete-anime/${page}`);
            return this.normalizeAnimeList(data.anime || data.results || []);
        } catch (error) {
            console.warn('Complete API failed, trying alternatives:', error);
            
            try {
                const data = await this.request(`/anime/samehadaku/completed?page=${page}`);
                return this.normalizeAnimeList(data.anime || data.results || []);
            } catch (error2) {
                console.error('All complete APIs failed:', error2);
                return this.getFallbackComplete();
            }
        }
    }

    // Latest episodes
    async getLatestEpisodes() {
        try {
            // Coba dari Samehadaku recent
            const data = await this.request('/anime/samehadaku/recent');
            return this.normalizeEpisodeList(data.episodes || data.results || []);
        } catch (error) {
            console.warn('Latest episodes API failed, trying alternatives:', error);
            
            try {
                // Coba dari Otakudesu
                const data = await this.request('/anime/home');
                const episodes = data.latest || data.recent || [];
                return this.normalizeEpisodeList(episodes);
            } catch (error2) {
                console.error('All latest episodes APIs failed:', error2);
                return this.getFallbackEpisodes();
            }
        }
    }

    // Schedule
    async getSchedule() {
        try {
            const data = await this.request('/anime/schedule');
            return this.normalizeSchedule(data.schedule || data.results || {});
        } catch (error) {
            console.warn('Schedule API failed:', error);
            return this.getFallbackSchedule();
        }
    }

    // Genres
    async getGenres() {
        try {
            const data = await this.request('/anime/genre');
            return this.normalizeGenres(data.genres || data.results || []);
        } catch (error) {
            console.warn('Genres API failed, trying alternatives:', error);
            
            try {
                const data = await this.request('/anime/samehadaku/genres');
                return this.normalizeGenres(data.genres || data.results || []);
            } catch (error2) {
                console.error('All genres APIs failed:', error2);
                return this.getFallbackGenres();
            }
        }
    }

    // Search anime
    async searchAnime(query, page = 1) {
        try {
            const data = await this.request(`/anime/search/${encodeURIComponent(query)}?page=${page}`);
            return {
                results: this.normalizeAnimeList(data.anime || data.results || []),
                totalPages: data.totalPages || data.pages || 1,
                currentPage: page,
                query: query
            };
        } catch (error) {
            console.warn('Search API failed, trying alternatives:', error);
            
            try {
                const data = await this.request(`/anime/samehadaku/search?q=${encodeURIComponent(query)}&page=${page}`);
                return {
                    results: this.normalizeAnimeList(data.anime || data.results || []),
                    totalPages: data.totalPages || 1,
                    currentPage: page,
                    query: query
                };
            } catch (error2) {
                console.error('All search APIs failed:', error2);
                return {
                    results: [],
                    totalPages: 0,
                    currentPage: 1,
                    query: query
                };
            }
        }
    }

    // Anime detail
    async getAnimeDetail(slug) {
        try {
            const data = await this.request(`/anime/anime/${slug}`);
            return this.normalizeAnimeDetail(data);
        } catch (error) {
            console.warn('Anime detail API failed, trying alternatives:', error);
            
            try {
                const data = await this.request(`/anime/samehadaku/anime/${slug}`);
                return this.normalizeAnimeDetail(data);
            } catch (error2) {
                console.error('All anime detail APIs failed:', error2);
                throw new Error(`Cannot fetch details for anime: ${slug}`);
            }
        }
    }

    // Episode detail
    async getEpisodeDetail(slug) {
        try {
            const data = await this.request(`/anime/episode/${slug}`);
            return this.normalizeEpisodeDetail(data);
        } catch (error) {
            console.warn('Episode detail API failed, trying alternatives:', error);
            
            try {
                const data = await this.request(`/anime/samehadaku/episode/${slug}`);
                return this.normalizeEpisodeDetail(data);
            } catch (error2) {
                console.error('All episode detail APIs failed:', error2);
                throw new Error(`Cannot fetch details for episode: ${slug}`);
            }
        }
    }

    // Batch download
    async getBatchDetail(slug) {
        try {
            const data = await this.request(`/anime/batch/${slug}`);
            return this.normalizeBatchDetail(data);
        } catch (error) {
            console.warn('Batch API failed, trying alternatives:', error);
            
            try {
                const data = await this.request(`/anime/samehadaku/batch/${slug}`);
                return this.normalizeBatchDetail(data);
            } catch (error2) {
                console.error('All batch APIs failed:', error2);
                throw new Error(`Cannot fetch batch: ${slug}`);
            }
        }
    }

    // Get streaming server
    async getStreamingServer(serverId) {
        try {
            const data = await this.request(`/anime/server/${serverId}`);
            return this.normalizeServerData(data);
        } catch (error) {
            console.warn('Streaming server API failed:', error);
            throw new Error(`Cannot fetch streaming server: ${serverId}`);
        }
    }

    // Random anime (from neko API)
    async getRandomAnime() {
        try {
            const data = await this.request('/anime/neko/random');
            return this.normalizeAnimeDetail(data);
        } catch (error) {
            console.warn('Random anime API failed:', error);
            
            // Fallback: Ambil dari trending dan pilih random
            const trending = await this.getTrending();
            if (trending.length > 0) {
                const randomIndex = Math.floor(Math.random() * trending.length);
                return this.getAnimeDetail(trending[randomIndex].slug);
            }
            throw new Error('Cannot fetch random anime');
        }
    }

    // Movies
    async getMovies(page = 1) {
        try {
            const data = await this.request(`/anime/samehadaku/movies?page=${page}`);
            return this.normalizeAnimeList(data.anime || data.results || []);
        } catch (error) {
            console.warn('Movies API failed:', error);
            return this.getFallbackMovies();
        }
    }

    // Genre anime list
    async getGenreAnime(genreSlug, page = 1) {
        try {
            const data = await this.request(`/anime/genre/${genreSlug}?page=${page}`);
            return {
                anime: this.normalizeAnimeList(data.anime || data.results || []),
                genre: data.genre || genreSlug,
                totalPages: data.totalPages || 1,
                currentPage: page
            };
        } catch (error) {
            console.warn('Genre anime API failed, trying alternatives:', error);
            
            try {
                const data = await this.request(`/anime/samehadaku/genres/${genreSlug}?page=${page}`);
                return {
                    anime: this.normalizeAnimeList(data.anime || data.results || []),
                    genre: data.genre || genreSlug,
                    totalPages: data.totalPages || 1,
                    currentPage: page
                };
            } catch (error2) {
                console.error('All genre anime APIs failed:', error2);
                throw new Error(`Cannot fetch anime for genre: ${genreSlug}`);
            }
        }
    }

    // Batch list
    async getBatchList(page = 1) {
        try {
            const data = await this.request(`/anime/samehadaku/batch?page=${page}`);
            return {
                batches: this.normalizeBatchList(data.batches || data.results || []),
                totalPages: data.totalPages || 1,
                currentPage: page
            };
        } catch (error) {
            console.warn('Batch list API failed:', error);
            return this.getFallbackBatchList();
        }
    }

    // Neko API latest
    async getNekoLatest() {
        try {
            const data = await this.request('/anime/neko/latest');
            return this.normalizeEpisodeList(data.episodes || data.results || []);
        } catch (error) {
            console.warn('Neko latest API failed:', error);
            return [];
        }
    }

    // Neko API release
    async getNekoRelease(page = 1) {
        try {
            const data = await this.request(`/anime/neko/release/${page}`);
            return this.normalizeAnimeList(data.anime || data.results || []);
        } catch (error) {
            console.warn('Neko release API failed:', error);
            return [];
        }
    }

    // Neko API search
    async searchNeko(query) {
        try {
            const data = await this.request(`/anime/neko/search/${encodeURIComponent(query)}`);
            return this.normalizeAnimeList(data.anime || data.results || []);
        } catch (error) {
            console.warn('Neko search API failed:', error);
            return [];
        }
    }

    // Normalization functions untuk standarisasi data dari berbagai API
    normalizeAnimeList(animeList) {
        return animeList.map(anime => ({
            id: anime.id || anime.mal_id || Math.random().toString(36).substr(2, 9),
            slug: anime.slug || anime.id || anime.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            title: anime.title || anime.name || 'Unknown Title',
            image: anime.image || anime.thumbnail || anime.poster || anime.images?.jpg?.image_url || '/assets/images/placeholder.jpg',
            episode: anime.episode || anime.episode_count || anime.episodes || 'N/A',
            type: anime.type || anime.media_type || 'TV',
            status: anime.status || 'Unknown',
            score: anime.score || anime.rating || anime.mean || null,
            synopsis: anime.synopsis || anime.description || '',
            genres: anime.genres || anime.genre_list || [],
            year: anime.year || anime.aired?.prop?.from?.year || new Date().getFullYear(),
            rating: anime.rating || 'PG-13'
        }));
    }

    normalizeEpisodeList(episodeList) {
        return episodeList.map(episode => ({
            id: episode.id || Math.random().toString(36).substr(2, 9),
            slug: episode.slug || episode.id || `episode-${Math.random().toString(36).substr(2, 9)}`,
            title: episode.title || episode.name || 'Unknown Episode',
            episode: episode.episode || episode.number || '1',
            animeTitle: episode.animeTitle || episode.anime_name || episode.series_title || 'Unknown Anime',
            animeSlug: episode.animeSlug || episode.anime_slug || episode.series_slug,
            image: episode.image || episode.thumbnail || '',
            date: episode.date || episode.uploaded || episode.created_at || new Date().toISOString(),
            duration: episode.duration || '24 min'
        }));
    }

    normalizeSchedule(scheduleData) {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const normalizedSchedule = {};
        
        days.forEach(day => {
            normalizedSchedule[day] = (scheduleData[day] || []).map(item => ({
                time: item.time || item.broadcast_time || '00:00',
                title: item.title || item.name || 'Unknown Anime',
                slug: item.slug || item.id,
                score: item.score || item.rating || null
            }));
        });
        
        return normalizedSchedule;
    }

    normalizeGenres(genres) {
        return genres.map(genre => ({
            id: genre.id || Math.random().toString(36).substr(2, 9),
            slug: genre.slug || genre.name?.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: genre.name || 'Unknown Genre',
            count: genre.count || genre.total || 0
        }));
    }

    normalizeAnimeDetail(detail) {
        return {
            id: detail.id || detail.mal_id,
            slug: detail.slug || detail.id,
            title: detail.title || detail.name,
            image: detail.image || detail.thumbnail || detail.images?.jpg?.large_image_url,
            synopsis: detail.synopsis || detail.description || '',
            episodes: detail.episodes || detail.episode_count || 0,
            status: detail.status || 'Unknown',
            type: detail.type || detail.media_type,
            score: detail.score || detail.rating || detail.mean,
            ranked: detail.ranked || detail.rank,
            popularity: detail.popularity,
            genres: detail.genres || detail.genre_list || [],
            studios: detail.studios || [],
            producers: detail.producers || [],
            duration: detail.duration || '24 min',
            rating: detail.rating || 'PG-13',
            aired: detail.aired || detail.broadcast || {},
            trailer: detail.trailer || detail.trailer_url,
            episodeList: detail.episodeList || detail.episodes_list || [],
            relations: detail.relations || detail.related || []
        };
    }

    normalizeEpisodeDetail(detail) {
        return {
            id: detail.id,
            slug: detail.slug,
            title: detail.title,
            episode: detail.episode || detail.number,
            animeTitle: detail.animeTitle || detail.series_title,
            animeSlug: detail.animeSlug || detail.series_slug,
            image: detail.image || detail.thumbnail,
            videoUrl: detail.videoUrl || detail.video_url,
            servers: detail.servers || detail.streaming_servers || [],
            downloadLinks: detail.downloadLinks || detail.download_links || [],
            nextEpisode: detail.nextEpisode || detail.next_episode,
            prevEpisode: detail.prevEpisode || detail.previous_episode
        };
    }

    normalizeBatchDetail(detail) {
        return {
            id: detail.id,
            slug: detail.slug,
            title: detail.title,
            animeTitle: detail.animeTitle || detail.series_title,
            totalEpisodes: detail.totalEpisodes || detail.episode_count,
            fileSize: detail.fileSize || detail.size,
            quality: detail.quality || '480p,720p,1080p',
            downloadLinks: detail.downloadLinks || detail.links || []
        };
    }

    normalizeServerData(server) {
        return {
            id: server.id,
            name: server.name,
            url: server.url || server.embed_url,
            quality: server.quality || 'auto'
        };
    }

    normalizeBatchList(batchList) {
        return batchList.map(batch => ({
            id: batch.id,
            slug: batch.slug,
            title: batch.title,
            animeTitle: batch.animeTitle || batch.series_title,
            totalEpisodes: batch.totalEpisodes || batch.episode_count,
            fileSize: batch.fileSize || batch.size,
            quality: batch.quality || 'Multiple',
            date: batch.date || batch.uploaded
        }));
    }

    // Fallback data untuk ketika semua API gagal
    getFallbackTrending() {
        return [
            {
                id: '1',
                slug: 'one-piece',
                title: 'One Piece',
                image: 'https://cdn.myanimelist.net/images/anime/6/73245.jpg',
                episode: '1078+',
                type: 'TV',
                score: 8.58
            },
            {
                id: '2',
                slug: 'attack-on-titan',
                title: 'Attack on Titan',
                image: 'https://cdn.myanimelist.net/images/anime/10/47347.jpg',
                episode: '88',
                type: 'TV',
                score: 8.54
            }
        ];
    }

    getFallbackOngoing() {
        return [
            {
                id: '3',
                slug: 'jujutsu-kaisen',
                title: 'Jujutsu Kaisen',
                image: 'https://cdn.myanimelist.net/images/anime/1171/109222.jpg',
                episode: '23+',
                type: 'TV',
                score: 8.63
            }
        ];
    }

    getFallbackComplete() {
        return [
            {
                id: '4',
                slug: 'fullmetal-alchemist-brotherhood',
                title: 'Fullmetal Alchemist: Brotherhood',
                image: 'https://cdn.myanimelist.net/images/anime/1208/94745.jpg',
                episode: '64',
                type: 'TV',
                score: 9.10
            }
        ];
    }

    getFallbackEpisodes() {
        return [
            {
                id: '1',
                slug: 'one-piece-episode-1078',
                title: 'The Legendary Battle! Luffy vs. Kaido',
                episode: '1078',
                animeTitle: 'One Piece',
                animeSlug: 'one-piece',
                date: new Date().toISOString()
            }
        ];
    }

    getFallbackSchedule() {
        return {
            monday: [
                { time: '20:00', title: 'One Piece', slug: 'one-piece', score: 8.58 }
            ],
            tuesday: [
                { time: '19:30', title: 'Attack on Titan', slug: 'attack-on-titan', score: 8.54 }
            ]
        };
    }

    getFallbackGenres() {
        return [
            { id: '1', slug: 'action', name: 'Action', count: 1500 },
            { id: '2', slug: 'adventure', name: 'Adventure', count: 1200 }
        ];
    }

    getFallbackMovies() {
        return [
            {
                id: 'movie-1',
                slug: 'kimetsu-no-yaiba-movie-mugen-train',
                title: 'Demon Slayer: Mugen Train',
                image: 'https://cdn.myanimelist.net/images/anime/1704/106947.jpg',
                type: 'Movie',
                score: 8.56
            }
        ];
    }

    getFallbackBatchList() {
        return [
            {
                id: 'batch-1',
                slug: 'attack-on-titan-complete-batch',
                title: 'Attack on Titan Complete Series',
                animeTitle: 'Attack on Titan',
                totalEpisodes: '88',
                fileSize: '25 GB',
                quality: '1080p',
                date: '2024-01-15'
            }
        ];
    }
}

// Initialize API
const animeAPI = new AnimeAPI();

// Export untuk penggunaan di modul lain
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AnimeAPI, animeAPI };
}