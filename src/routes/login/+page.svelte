<script>
  
  let email;
  let password;
  function login() {
    console.log(`${email} ${password}`);
  }
</script>

<div class="hero min-h-screen">
  <div class="hero-content flex-col lg:flex-row-reverse">
    <div class="text-center lg:text-left">
      <h1 class="text-5xl font-bold">Login now!</h1>
      <p class="py-6">
        Join our platform to start managing and collecting bids efficiently.
        <br />
        <br />
        Don't have an account?{" "}
        <a href="/register" class="link link-primary">Register</a>
      </p>
    </div>
    <div class="card bg-base-100 w-full max-w-sm shrink-0 shadow-2xl">
      <!-- svelte-ignore a11y-label-has-associated-control -->
      <form class="card-body">
        <div class="form-control">
          <label class="label">
            <span class="label-text">Email</span>
          </label>
          <input
            type="email"
            class="input input-bordered"
            bind:value={email}
            required
          />
        </div>
        <div class="form-control">
          <label class="label">
            <span class="label-text">Password</span>
          </label>
          <input
            type="password"
            class="input input-bordered"
            bind:value={password}
            required
          />
          <label class="label">
            <a href="#" class="label-text-alt link link-hover"
              >Forgot password?</a
            >
          </label>
        </div>
        <div class="form-control mt-6">
          <button class="btn btn-primary" on:click={login}>Login</button>
        </div>
      </form>
    </div>
  </div>
</div>
