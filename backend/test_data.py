import sys
import os

# Add the backend directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.f1_data import F1DataService

def run_tests():
    try:
        service = F1DataService()
        print("Testing get_seasons()...")
        seasons = service.get_seasons()
        print(f"Got {len(seasons)} seasons. First season: {seasons[0].year} with {len(seasons[0].events)} events.")
        
        print("\nTesting get_results(2024, 'Bahrain', 'R')...")
        results = service.get_results(2024, 'Bahrain', 'R')
        print("Top 3 finishers:")
        for driver in results.drivers[:3]:
            print(f"{driver.position}. {driver.driver.abbreviation} - {driver.driver.team}")
            
        print("\nBackend testing complete and successful!")
    except Exception as e:
        print(f"\nError occurred: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    run_tests()
