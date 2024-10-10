let ballotData = [];
let zipLookup = [];
let autocompleteData = [];
showdown.setOption('tables', true);
const converter = new showdown.Converter();

// Function to load and parse the CSV files
function loadCSVs() {
    Papa.parse('zip_lookup.csv', {
        download: true,
        header: true,
        complete: function(results) {
            zipLookup = results.data;
            console.log('Zip lookup CSV loaded');
            setupAutocomplete();

            // After zip_lookup is loaded, load the ballot data
            Papa.parse('data.csv', {
                download: true,
                header: true,
                complete: function(results) {
                    ballotData = results.data;
                    console.log('Ballot data CSV loaded');
                }
            });
        }
    });
}

// Function to set up autocomplete
function setupAutocomplete() {
    autocompleteData = zipLookup.flatMap(row => [
        `${row.county}, ${row.state} (${row.zip})`
    ]);
    autocompleteData = [...new Set(autocompleteData)]; // Remove duplicates

    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', handleInput);
    searchInput.addEventListener('keydown', handleKeyDown);
}

function handleInput(e) {
    const input = e.target.value.toLowerCase();
    if (input.length < 2) return;

    const matches = autocompleteData.filter(item => 
        item.toLowerCase().includes(input)
    ).slice(0, 5); // Limit to 5 suggestions

    showSuggestions(matches);
}

function showSuggestions(suggestions) {
    let suggestionList = document.getElementById('suggestions');
    
    if (!suggestionList) {
        suggestionList = document.createElement('ul');
        suggestionList.id = 'suggestions';
        const searchContainer = document.getElementById('search-container');
        searchContainer.appendChild(suggestionList);
    }

    suggestionList.innerHTML = '';
    suggestions.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        li.addEventListener('click', () => {
            document.getElementById('search-input').value = item;
            removeSuggestionList();
            search(item);
        });
        suggestionList.appendChild(li);
    });
}

function handleKeyDown(e) {
    const suggestionList = document.getElementById('suggestions');
    const suggestions = suggestionList.children;
    let selectedIndex = -1;

    for (let i = 0; i < suggestions.length; i++) {
        if (suggestions[i].classList.contains('selected')) {
            selectedIndex = i;
            break;
        }
    }

    switch (e.key) {
        case 'ArrowDown':
            e.preventDefault();
            if (selectedIndex < suggestions.length - 1) {
                if (selectedIndex > -1) suggestions[selectedIndex].classList.remove('selected');
                suggestions[selectedIndex + 1].classList.add('selected');
            }
            break;
        case 'ArrowUp':
            e.preventDefault();
            if (selectedIndex > 0) {
                suggestions[selectedIndex].classList.remove('selected');
                suggestions[selectedIndex - 1].classList.add('selected');
            }
            break;
        case 'Enter':
            e.preventDefault();
            if (selectedIndex > -1) {
                document.getElementById('search-input').value = suggestions[selectedIndex].textContent;
                removeSuggestionList();
                search(suggestions[selectedIndex].textContent);
            } else {
                search();
            }
            break;
    }
}

// Function to search for a county, state, or zip code
function search(searchTerm = null) {
    removeSuggestionList();
    searchTerm = searchTerm || document.getElementById('search-input').value.trim();
    
    // Try to parse the search term into county, state, and zip
    const parsedResult = parseSearchTerm(searchTerm);
    
    let results = [];
    
    if (parsedResult) {
        const { county, state, zip } = parsedResult;
        console.log(zip);
        results = ballotData.filter(row => 
            row.zip && row.zip.includes(zip)
        );
    }
    
    // If parsing fails or no exact match found, search for any partial match
    if (results.length === 0) {
        results = ballotData.filter(row => 
            ['county', 'state', 'zip', 'district'].some(key => 
                String(row[key]).toLowerCase().includes(searchTerm.toLowerCase())
            )
        );
    }
    
    displayResults(results);
}

function parseSearchTerm(searchTerm) {
    const parts = searchTerm.split(',');
    if (parts.length === 2) {
        const county = parts[0].trim();
        const stateZipParts = parts[1].trim().split('(');
        if (stateZipParts.length === 2) {
            const state = stateZipParts[0].trim();
            const zip = stateZipParts[1].replace(')', '').trim();
            return { county, state, zip };
        }
    }
    return null;
}

// Function to display the search results
function displayResults(results) {
    const resultsDiv = document.getElementById('results');
    if (results.length > 0) {
        resultsDiv.innerHTML = results.map((result, index) => {
            const title = result.district ? 
                `${result.county}, ${result.state} － ${result.district}` : 
                `${result.county}, ${result.state}`;
            
            // Use showdown to convert Markdown to HTML
            const htmlContent = converter.makeHtml(result.ballot_markdown);
            
            return `
                <div class="result-toggle">
                    <h2 onclick="toggleBallot(${index})">${title}</h2>
                    <div id="ballot-${index}" class="ballot-content" style="display: none;">
                        ${htmlContent}
                    </div>
                </div>
            `;
        }).join('');
    } else {
        resultsDiv.innerHTML = '<p>No results found.</p>';
    }
}

// Function to toggle the visibility of ballot content
function toggleBallot(index) {
    const ballotContent = document.getElementById(`ballot-${index}`);
    ballotContent.style.display = ballotContent.style.display === 'none' ? 'block' : 'none';
}

function displayDefaultMessage() {
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = `
<h2>Your Voice, Your Vote</h2>
<p>Elections shape our daily life. Schools, taxes, roads – it's all on the ballot. Know what's at stake before you go.</p>

<p>To see what you'll be voting for, type and select from any location in the United States. Examples:</p>
<ul>
    <li>Los Angeles, California (90011)</li>
    <li>Cook, Illinois (60629)</li>
    <li>Kings, New York (11226)</li>
</ul>
<p>Get the facts. Be prepared. Vote smart.</p>

<p><strong>Disclaimer: This tool provides a preview of your ballot based on available data from <a href="https://ballotpedia.org" target="_blank">Ballotpedia</a>.</strong></p>
<p><strong>It may not include all races or candidates. Always verify with your local election office for the most complete and up-to-date information.</strong></p>
    `;
}

function removeSuggestionList() {
    const suggestionList = document.getElementById('suggestions');
    if (suggestionList) {
        suggestionList.remove();
    }
}

function setupDocumentClickListener() {
    document.addEventListener('click', (event) => {
        const searchContainer = document.getElementById('search-container');
        const isClickInsideSearchContainer = searchContainer.contains(event.target);
        
        if (!isClickInsideSearchContainer) {
            removeSuggestionList();
        }
    });
}

// Load the CSVs when the page loads
// Load the CSVs and set up event listeners when the page loads
document.addEventListener('DOMContentLoaded', () => {
    displayDefaultMessage();
    loadCSVs();
    setupDocumentClickListener();
});