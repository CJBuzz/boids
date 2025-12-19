# Boids Simulation

Built a simulation to try out boids algorithm. You can view it [here](https://cjbuzz.github.io/boids/).

Idea is inspired by Conrad Parker's [post](http://www.kfish.org/boids/pseudocode.html) and Ben Eater's [code](https://github.com/beneater/boids).

### Boid rules

1. Fly towards centre of mass of nearby boids.
2. Keep a small distance away from other boids and objects.
3. Match velocity with nearby boids.

More details can be found on Conrad Parker's [post](http://www.kfish.org/boids/pseudocode.html).

### Actions

Press `spacebar` to toggle between these modes:

-   **View**  
    - Clicking won't do anything.
-   **Add boids**
    - Click to add more boids at mouse position (initially has 100 boids).
-   **Add goals** 
    - Click to add an obstacle that boids will avoid.
    - `Ctrl` + click to remove nearby obstacles.
-   **Add scatterers** 
    - Click to add a scatterer; boids within the scatterer's zone will move away from each other (negation of [rule 1](#boid-rules)).
    - `Ctrl` + click to remove nearby scatterers.
-   **Add goals** 
    - Click to add a goal that boids will move towards.
    - `Ctrl` + click to remove nearby goals.


Note on removal: click close to the center of environmental object.

### To-do

_(If I remember)_

-   [x] Add ability to remove goals and scatterers
-   [x] Add environmental obstacles that boids try to avoid
-   [ ] More efficient methods to locate neighbouring boids
-   [ ] Try out 3D simulation
