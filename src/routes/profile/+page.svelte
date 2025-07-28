<script>
    // get current logged user
    import { onMount } from "svelte";
    import toast from "svelte-french-toast";
    import { user, isAuthenticated } from "$lib/auth.js";

    onMount(() => {
        // Check if the user is authenticated
        if (!isAuthenticated) {
            toast.error("You must be logged in to access this page.");
            // Redirect to login page after 1 second
            setTimeout(() => {
                window.location.href = "/login";
            }, 1000);
        }
    });
</script>

<svelte:head>
  <title>Profile - BIDS Collector</title>
</svelte:head>

{#if user}
    <div class="hero">
        <div class="hero-content w-2/3 flex-col lg:flex-row-reverse">
            <div class="card bg-base-200 w-full shrink-0 shadow-2xl">
                <!-- svelte-ignore a11y-label-has-associated-control -->
                <form class="card-body">
                    <div class="card-title mb-4">
                        <h2>User Profile</h2>
                    </div>
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Name</span>
                        </label>
                        <input
                            type="text"
                            class="input input-bordered"
                            readonly
                            bind:value={user.name}
                        />
                    </div>
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Email</span>
                        </label>
                        <input
                            type="email"
                            class="input input-bordered"
                            readonly
                            bind:value={user.email}
                        />
                    </div>
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Nickname</span>
                        </label>
                        <input
                            type="text"
                            class="input input-bordered"
                            readonly
                            bind:value={user.nickname}
                        />
                    </div>
                    <div class="form-control">
                        <label class="label">
                            <span class="label-text">Last Updated</span>
                        </label>
                        <input
                            type="text"
                            class="input input-bordered"
                            readonly
                            value={user.updated_at ? new Date(user.updated_at).toLocaleString() : 'N/A'}
                        />
                    </div>
                    <div class="form-control mt-6">
                        <a href="/" class="btn btn-primary">Back to Dashboard</a>
                    </div>
                </form>
            </div>
        </div>
    </div>
{:else}
    <div class="hero min-h-screen">
        <div class="hero-content text-center">
            <div class="max-w-md">
                <h1 class="text-3xl font-bold">Profile</h1>
                <p class="py-6">You need to be logged in to view your profile.</p>
                <a href="/login" class="btn btn-primary">Login</a>
            </div>
        </div>
    </div>
{/if}
