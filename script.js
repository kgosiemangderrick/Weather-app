// ============================================
// WEATHER APP WITH DEMO MODE
// ============================================

// API Configuration
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5';
const GEOCODING_API_URL = 'https://api.openweathermap.org/geo/1.0';

// App State
let API_KEY = localStorage.getItem('weatherApiKey') || '';
let isDemoMode = localStorage.getItem('demoMode') === 'true' || false;
let searchTimeout;

// DOM Elements
const apiKeySection = document.getElementById('apiKeySection');
const searchSection = document.getElementById('searchSection');
const weatherSection = document.getElementById('weatherSection');
const demoBadge = document.getElementById('demoBadge');
const modeBadge = document.getElementById('modeBadge');
const cityInput = document.getElementById('cityInput');
const searchBtn = document.getElementById('searchBtn');
const suggestions = document.getElementById('suggestions');
const spinner = document.getElementById('spinner');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');
const demoQuickPicks = document.getElementById('demoQuickPicks');

// Weather display elements
const cityName = document.getElementById('cityName');
const date = document.getElementById('date');
const weatherIcon = document.getElementById('weatherIcon');
const temp = document.getElementById('temp');
const description = document.getElementById('description');
const feelsLike = document.getElementById('feelsLike');
const humidity = document.getElementById('humidity');
const windSpeed = document.getElementById('windSpeed');
const pressure = document.getElementById('pressure');
const forecastContainer = document.getElementById('forecastContainer');

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    updateUIBasedOnMode();
});

function initializeApp() {
    // Show/hide sections based on mode and API key
    if (isDemoMode) {
        enableDemoMode();
    } else if (API_KEY) {
        enableLiveMode();
    } else {
        apiKeySection.style.display = 'block';
        searchSection.style.display = 'none';
        weatherSection.style.display = 'none';
    }
}

function setupEventListeners() {
    // Add this inside the setupEventListeners() function
const switchToLiveBtn = document.getElementById('switchToLiveBtn');
if (switchToLiveBtn) {
    switchToLiveBtn.addEventListener('click', forceLiveMode);
}
    // Tab switching
    document.getElementById('liveModeTab').addEventListener('click', () => switchTab('live'));
    document.getElementById('demoModeTab').addEventListener('click', () => switchTab('demo'));
    
    // Buttons
    document.getElementById('saveApiKeyBtn').addEventListener('click', saveApiKey);
    document.getElementById('tryDemoBtn').addEventListener('click', enableDemoMode);
    document.getElementById('enableDemoBtn').addEventListener('click', enableDemoMode);
    
    // API key input enter key
    document.getElementById('apiKeyInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') saveApiKey();
    });
    
    // Demo city clicks
    document.querySelectorAll('.demo-city').forEach(city => {
        city.addEventListener('click', (e) => {
            const cityName = e.target.dataset.city;
            loadDemoWeather(cityName);
        });
    });
    
    // Quick pick buttons
    document.querySelectorAll('.quick-pick').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const city = e.target.dataset.city;
            cityInput.value = city;
            if (isDemoMode) {
                loadDemoWeather(city);
            } else {
                handleSearch();
            }
        });
    });
    
    // Search functionality
    searchBtn.addEventListener('click', handleSearch);
    cityInput.addEventListener('input', handleInput);
    cityInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!cityInput.contains(e.target) && !suggestions.contains(e.target)) {
            suggestions.classList.remove('active');
        }
    });
}

// ============================================
// MODE MANAGEMENT
// ============================================

function switchTab(tab) {
    // Update tab buttons
    document.getElementById('liveModeTab').classList.toggle('active', tab === 'live');
    document.getElementById('demoModeTab').classList.toggle('active', tab === 'demo');
    
    // Show corresponding content
    document.getElementById('liveModeContent').classList.toggle('active', tab === 'live');
    document.getElementById('demoModeContent').classList.toggle('active', tab === 'demo');
}

function enableLiveMode() {
    isDemoMode = false;
    localStorage.setItem('demoMode', 'false');
    apiKeySection.style.display = 'none';
    searchSection.style.display = 'block';
    demoBadge.style.display = 'none';
    if (modeBadge) modeBadge.style.display = 'none';
    enableSearch();
}

function enableDemoMode() {
    isDemoMode = true;
    localStorage.setItem('demoMode', 'true');
    apiKeySection.style.display = 'none';
    searchSection.style.display = 'block';
    demoBadge.style.display = 'inline-flex';
    if (modeBadge) {
        modeBadge.style.display = 'inline-block';
        modeBadge.textContent = 'Demo Mode';
    }
    enableSearch();
    showNotification('Demo Mode activated! Try the sample cities below.', 'info');
}

function updateUIBasedOnMode() {
    if (isDemoMode) {
        demoBadge.style.display = 'inline-flex';
        if (modeBadge) {
            modeBadge.style.display = 'inline-block';
            modeBadge.textContent = 'Demo Mode';
        }
    } else {
        demoBadge.style.display = 'none';
        if (modeBadge) modeBadge.style.display = 'none';
    }
}

function enableSearch() {
    cityInput.disabled = false;
    searchBtn.disabled = false;
}

// ============================================
// API KEY MANAGEMENT
// ============================================

function saveApiKey() {
    const keyInput = document.getElementById('apiKeyInput');
    const key = keyInput.value.trim();
    
    if (!key) {
        showNotification('Please enter an API key', 'error');
        return;
    }
    
    // Basic validation - OpenWeatherMap keys are usually 32 chars
    if (key.length < 20) {
        showNotification('Please enter a valid API key', 'error');
        return;
    }
    
    API_KEY = key;
    localStorage.setItem('weatherApiKey', key);
    showNotification('API key saved successfully!', 'success');
    enableLiveMode();
}

// ============================================
// SEARCH & SUGGESTIONS
// ============================================

function handleInput() {
    if (isDemoMode) return; // No suggestions in demo mode
    
    clearTimeout(searchTimeout);
    const query = cityInput.value.trim();
    
    if (query.length < 3) {
        suggestions.classList.remove('active');
        return;
    }
    
    searchTimeout = setTimeout(() => getCitySuggestions(query), 500);
}

async function getCitySuggestions(query) {
    if (!API_KEY) return;
    
    try {
        const response = await fetch(
            `${GEOCODING_API_URL}/direct?q=${encodeURIComponent(query)}&limit=5&appid=${API_KEY}`
        );
        
        if (!response.ok) throw new Error('Failed to fetch suggestions');
        
        const cities = await response.json();
        displaySuggestions(cities);
    } catch (error) {
        console.error('Error fetching suggestions:', error);
    }
}

function displaySuggestions(cities) {
    if (!cities.length) {
        suggestions.classList.remove('active');
        return;
    }
    
    suggestions.innerHTML = cities
        .map(city => `
            <div class="suggestion-item" onclick="selectCity('${city.name}', ${city.lat}, ${city.lon})">
                ${city.name}, ${city.country} ${city.state ? `, ${city.state}` : ''}
            </div>
        `)
        .join('');
    
    suggestions.classList.add('active');
}

window.selectCity = (name, lat, lon) => {
    cityInput.value = name;
    suggestions.classList.remove('active');
    getWeatherData(lat, lon);
};

// ============================================
// WEATHER DATA FETCHING
// ============================================

async function handleSearch() {
    const query = cityInput.value.trim();
    
    if (!query) {
        showError('Please enter a city name');
        return;
    }
    
    if (isDemoMode) {
        loadDemoWeather(query);
        return;
    }
    
    if (!API_KEY) {
        showError('Please enter your API key first');
        apiKeySection.style.display = 'block';
        return;
    }
    
    try {
        showLoading();
        hideError();
        
        const geoResponse = await fetch(
            `${GEOCODING_API_URL}/direct?q=${encodeURIComponent(query)}&limit=1&appid=${API_KEY}`
        );
        
        if (geoResponse.status === 401) {
            throw new Error('Invalid API key. Please check your key.');
        }
        
        if (!geoResponse.ok) throw new Error('Failed to find city');
        
        const cities = await geoResponse.json();
        
        if (!cities.length) {
            throw new Error('City not found. Please check the name and try again.');
        }
        
        const { lat, lon, name } = cities[0];
        await getWeatherData(lat, lon, name);
        
    } catch (error) {
        showError(error.message);
        if (error.message.includes('API key')) {
            localStorage.removeItem('weatherApiKey');
            API_KEY = '';
        }
    } finally {
        hideLoading();
    }
}

async function getWeatherData(lat, lon, cityNameDisplay = null) {
    try {
        showLoading();
        hideError();
        
        const weatherResponse = await fetch(
            `${WEATHER_API_URL}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );
        
        if (!weatherResponse.ok) throw new Error('Failed to fetch weather data');
        
        const weatherData = await weatherResponse.json();
        
        const forecastResponse = await fetch(
            `${WEATHER_API_URL}/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
        );
        
        if (!forecastResponse.ok) throw new Error('Failed to fetch forecast data');
        
        const forecastData = await forecastResponse.json();
        
        displayCurrentWeather(weatherData, cityNameDisplay);
        displayForecast(forecastData);
        
        weatherSection.style.display = 'block';
        weatherSection.scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        showError(error.message);
        weatherSection.style.display = 'none';
    } finally {
        hideLoading();
    }
}

// ============================================
// DEMO MODE DATA
// ============================================

function loadDemoWeather(city) {
    showLoading();
    hideError();
    
    setTimeout(() => {
        const demoData = getDemoWeatherData(city);
        displayCurrentWeather(demoData.current, city);
        displayForecast(demoData.forecast);
        weatherSection.style.display = 'block';
        hideLoading();
        showNotification(`Showing demo data for ${city}`, 'info');
    }, 500);
}

function getDemoWeatherData(city) {
    const demoSettings = {
        'cape-town': {
            current: {
                name: 'Cape Town',
                main: { temp: 22, feels_like: 21, humidity: 65, pressure: 1015 },
                weather: [{ icon: '02d', description: 'partly cloudy' }],
                wind: { speed: 5.5 }
            },
            forecast: generateDemoForecast([22, 23, 21, 20, 22])
        },
        'johannesburg': {
            current: {
                name: 'Johannesburg',
                main: { temp: 25, feels_like: 24, humidity: 45, pressure: 1020 },
                weather: [{ icon: '01d', description: 'clear sky' }],
                wind: { speed: 4.2 }
            },
            forecast: generateDemoForecast([25, 26, 24, 25, 26])
        },
        'durban': {
            current: {
                name: 'Durban',
                main: { temp: 28, feels_like: 30, humidity: 75, pressure: 1012 },
                weather: [{ icon: '03d', description: 'scattered clouds' }],
                wind: { speed: 6.1 }
            },
            forecast: generateDemoForecast([28, 27, 28, 29, 28])
        },
        'london': {
            current: {
                name: 'London',
                main: { temp: 15, feels_like: 13, humidity: 80, pressure: 1008 },
                weather: [{ icon: '10d', description: 'light rain' }],
                wind: { speed: 7.2 }
            },
            forecast: generateDemoForecast([15, 14, 15, 16, 14])
        },
        'tokyo': {
            current: {
                name: 'Tokyo',
                main: { temp: 18, feels_like: 17, humidity: 70, pressure: 1018 },
                weather: [{ icon: '09d', description: 'light rain' }],
                wind: { speed: 3.8 }
            },
            forecast: generateDemoForecast([18, 19, 17, 18, 20])
        },
        'new-york': {
            current: {
                name: 'New York',
                main: { temp: 20, feels_like: 19, humidity: 60, pressure: 1016 },
                weather: [{ icon: '02d', description: 'few clouds' }],
                wind: { speed: 5.9 }
            },
            forecast: generateDemoForecast([20, 21, 19, 20, 18])
        }
    };
    
    const normalizedCity = city.toLowerCase().replace(' ', '-');
    return demoSettings[normalizedCity] || {
        current: {
            name: city,
            main: { temp: 20, feels_like: 19, humidity: 60, pressure: 1013 },
            weather: [{ icon: '01d', description: 'clear sky' }],
            wind: { speed: 4.0 }
        },
        forecast: generateDemoForecast([20, 21, 20, 19, 20])
    };
}

function generateDemoForecast(temps) {
    return {
        list: temps.map((temp, index) => ({
            dt_txt: new Date(Date.now() + (index + 1) * 86400000).toISOString(),
            main: { temp },
            weather: [{ icon: '01d', description: 'clear sky' }]
        }))
    };
}

// ============================================
// DISPLAY FUNCTIONS
// ============================================

function displayCurrentWeather(data, customCityName = null) {
    cityName.textContent = customCityName || data.name;
    date.textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const iconMap = {
        '01d': 'fa-sun', '01n': 'fa-moon',
        '02d': 'fa-cloud-sun', '02n': 'fa-cloud-moon',
        '03d': 'fa-cloud', '03n': 'fa-cloud',
        '04d': 'fa-cloud', '04n': 'fa-cloud',
        '09d': 'fa-cloud-rain', '09n': 'fa-cloud-rain',
        '10d': 'fa-cloud-sun-rain', '10n': 'fa-cloud-moon-rain',
        '11d': 'fa-bolt', '11n': 'fa-bolt',
        '13d': 'fa-snowflake', '13n': 'fa-snowflake',
        '50d': 'fa-smog', '50n': 'fa-smog'
    };
    
    const iconCode = data.weather[0].icon;
    weatherIcon.className = `fas ${iconMap[iconCode] || 'fa-cloud'}`;
    
    temp.textContent = Math.round(data.main.temp);
    description.textContent = data.weather[0].description;
    feelsLike.textContent = Math.round(data.main.feels_like);
    humidity.textContent = data.main.humidity;
    windSpeed.textContent = Math.round(data.wind.speed * 3.6);
    pressure.textContent = data.main.pressure;
}

function displayForecast(data) {
    const dailyForecasts = data.list.filter(item => 
        item.dt_txt.includes('12:00:00')
    ).slice(0, 5);
    
    forecastContainer.innerHTML = dailyForecasts.map(day => {
        const date = new Date(day.dt_txt);
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        const temp = Math.round(day.main.temp);
        const description = day.weather[0].description;
        const icon = day.weather[0].icon;
        
        const iconMap = {
            '01d': 'fa-sun', '01n': 'fa-moon',
            '02d': 'fa-cloud-sun', '02n': 'fa-cloud-moon',
            '03d': 'fa-cloud', '03n': 'fa-cloud',
            '04d': 'fa-cloud', '04n': 'fa-cloud',
            '09d': 'fa-cloud-rain', '09n': 'fa-cloud-rain',
            '10d': 'fa-cloud-sun-rain', '10n': 'fa-cloud-moon-rain',
            '11d': 'fa-bolt', '11n': 'fa-bolt',
            '13d': 'fa-snowflake', '13n': 'fa-snowflake',
            '50d': 'fa-smog', '50n': 'fa-smog'
        };
        
        return `
            <div class="forecast-card">
                <div class="date">${dayName}</div>
                <i class="fas ${iconMap[icon] || 'fa-cloud'}"></i>
                <div class="forecast-temp">${temp}°C</div>
                <div class="forecast-desc">${description}</div>
            </div>
        `;
    }).join('');
}

// ============================================
// UI HELPERS
// ============================================

function showLoading() {
    spinner.classList.add('active');
}

function hideLoading() {
    spinner.classList.remove('active');
}

function showError(message) {
    errorText.textContent = message;
    errorMessage.style.display = 'block';
    weatherSection.style.display = 'none';
}

function hideError() {
    errorMessage.style.display = 'none';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// Force switch to Live Mode (clears demo settings)
function forceLiveMode() {
    // Clear all stored settings
    localStorage.removeItem('demoMode');
    localStorage.removeItem('weatherApiKey');
    
    // Reset app state
    isDemoMode = false;
    API_KEY = '';
    
    // Hide weather section
    weatherSection.style.display = 'none';
    
    // Show API key section with Live Mode tab active
    apiKeySection.style.display = 'block';
    searchSection.style.display = 'none';
    
    // Switch to Live Mode tab
    switchTab('live');
    
    // Clear any search input
    cityInput.value = '';
    
    // Show confirmation
    showNotification('Switched to Live Mode. Please enter your API key.', 'success');
    
    console.log('Force switched to Live Mode - localStorage cleared');
}

// ============================================
// EXPOSE FUNCTIONS TO WINDOW
// ============================================

window.selectCity = selectCity;