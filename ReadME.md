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

-   **View** - clicking won't do anything.
-   **Add boids** - click to add more boids at mouse position (initially has 100 boids).
-   **Add scatterers** - click to add a scatterer; boids within the scatterer's zone will move away from each other (negation of [rule 1](#boid-rules)).
-   **Add goals** - click to add a goal that boids will move towards.

### To-do

_(If I remember)_

-   [ ] Add ability to remove goals and scatterers
-   [ ] Add environmental obstacles that boids try to avoid
-   [ ] More efficient methods to locate neighbouring boids
-   [ ] Try out 3D simulation
