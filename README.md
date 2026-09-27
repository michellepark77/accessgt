# Street Smart


An AI-powered campus map that shows which elevators, water fountains, and restrooms at Georgia Tech are out of service or unsanitary right now.


## Inspiration

On a large campus, you never know whether you'll find an unfiltered water fountain, a dirty bathroom, or an elevator that's out of service. At Georgia Tech, there's no single place to check, so people only find out after the trip there. For students with mobility needs, a broken elevator can mean a long detour or no access to a restroom at all. We built Street Smart to close that gap.

## What it does

Students report problems and rate places, so others can see which resources are working before they go. A user drops a pin, snaps a photo, and describes the issue. Gemini Flash turns that into a structured report, which then appears on the map for everyone.

## How we built it

- **React + Vite** for the frontend, with the **Google Maps JavaScript API** for the interactive map
- **Google Geocoding API + Google Javascript API** to turn a place's address into map coordinates, so new resources can be pinned
- **Gemini Flash** to analyze the user's description and photo and autofill the report (location and specific problem)
- **Supabase** to store every report, acting as the single source that connects reports to pins on the map
- **Vercel** for hosting, with a serverless function that keeps our API keys off the browser

## Challenges

- **Storing locations:** Locations were first hardcoded. We switched to geocoded coordinates so reports and pins stay consistent.
- **Connecting backend and frontend safely:** With several APIs, we had to learn where keys belong. Environment variables and a serverless function solved it.
- **Learning map APIs:** A single Maps API wasn't enough. Adding the Geocoding API unified map placement across the frontend and backend.

## Accomplishments

As an all-women team mostly new to frontend and image-based tools, we built a full-stack pipeline in one weekend: drop a pin, snap a photo, let Gemini autofill a report, and see it on the map. Getting Geocoding, Google Maps, an AI vision model, and a database to work together was a big milestone, and we're proud it addresses a real accessibility gap at Georgia Tech.

## What we learned

Most of us had never integrated a real-world API before. We learned how geocoding makes addresses plottable, how to structure a multimodal AI pipeline, and how to keep a database in sync with a live map. We also learned to scope down, setting aside rankings, distance calculations, and extra resource types to finish on time.

## What's next

- **More resources:** microwaves, printers, trash cans, and more
- **More testing:** a wider range of student descriptions and photos to improve AI accuracy
- **More campuses:** making Street Smart work beyond Georgia Tech

## Run locally

```bash
git clone https://github.com/michellepark77/accessgt.git
cd accessgt
npm install
```

Create `.env.local` (no spaces around `=`) with `GEMINI_API_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_PUBLISHABLE_KEY`, then run `npx vercel dev` and open [localhost:3000](http://localhost:3000).
