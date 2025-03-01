<script>
  import {
    Button,
    DatePicker,
    Divider,
    Layout,
    notifications,
    Pagination,
    Select,
    Heading,
    Body,
    Tags,
    Tag,
    Table,
  } from "@budibase/bbui"
  import { backups, licensing, auth, admin, overview } from "stores/portal"
  import { createPaginationStore } from "helpers/pagination"
  import TimeAgoRenderer from "./_components/TimeAgoRenderer.svelte"
  import AppSizeRenderer from "./_components/AppSizeRenderer.svelte"
  import ActionsRenderer from "./_components/ActionsRenderer.svelte"
  import UserRenderer from "./_components/UserRenderer.svelte"
  import StatusRenderer from "./_components/StatusRenderer.svelte"
  import TypeRenderer from "./_components/TypeRenderer.svelte"
  import BackupsDefault from "assets/backups-default.png"
  import { BackupTrigger, BackupType } from "constants/backend/backups"
  import { onMount } from "svelte"

  let loading = true
  let backupData = null
  let pageInfo = createPaginationStore()
  let filterOpt = null
  let startDate = null
  let endDate = null
  let filters = [
    {
      label: "Manual backup",
      value: { type: BackupType.BACKUP, trigger: BackupTrigger.MANUAL },
    },
    {
      label: "Published backup",
      value: { type: BackupType.BACKUP, trigger: BackupTrigger.PUBLISH },
    },
    {
      label: "Pre-restore backup",
      value: { type: BackupType.BACKUP, trigger: BackupTrigger.RESTORING },
    },
    {
      label: "Manual restore",
      value: { type: BackupType.RESTORE, trigger: BackupTrigger.MANUAL },
    },
  ]

  $: app = $overview.selectedApp
  $: page = $pageInfo.page
  $: fetchBackups(filterOpt, page, startDate, endDate)

  let schema = {
    type: {
      displayName: "Type",
      width: "auto",
    },
    createdAt: {
      displayName: "Date",
      width: "auto",
    },
    appSize: {
      displayName: "App size",
      width: "auto",
    },
    createdBy: {
      displayName: "User",
      width: "auto",
    },
    status: {
      displayName: "Status",
      width: "auto",
    },
    actions: {
      displayName: null,
      width: "auto",
    },
  }

  const customRenderers = [
    { column: "appSize", component: AppSizeRenderer },
    { column: "actions", component: ActionsRenderer },
    { column: "createdAt", component: TimeAgoRenderer },
    { column: "createdBy", component: UserRenderer },
    { column: "status", component: StatusRenderer },
    { column: "type", component: TypeRenderer },
  ]

  function flattenBackups(backups) {
    return backups.map(backup => {
      return {
        ...backup,
        ...backup?.contents,
      }
    })
  }

  async function fetchBackups(filters, page, startDate, endDate) {
    const response = await backups.searchBackups({
      appId: app.instance._id,
      ...filters,
      page,
      startDate,
      endDate,
    })
    pageInfo.fetched(response.hasNextPage, response.nextPage)

    // flatten so we have an easier structure to use for the table schema
    backupData = flattenBackups(response.data)
  }

  async function createManualBackup() {
    try {
      loading = true
      let response = await backups.createManualBackup({
        appId: app.instance._id,
      })
      await fetchBackups(filterOpt, page)
      notifications.success(response.message)
    } catch {
      notifications.error("Unable to create backup")
    }
  }

  const poll = backupData => {
    if (backupData === null) {
      return
    }

    if (backupData.some(datum => datum.status === "started")) {
      setTimeout(() => fetchBackups(filterOpt, page), 2000)
    } else {
      loading = false
    }
  }

  $: poll(backupData)

  async function handleButtonClick({ detail }) {
    if (detail.type === "backupDelete") {
      await backups.deleteBackup({
        appId: app.instance._id,
        backupId: detail.backupId,
      })
      await fetchBackups(filterOpt, page)
    } else if (detail.type === "backupRestore") {
      await backups.restoreBackup({
        appId: app.instance._id,
        backupId: detail.backupId,
        name: detail.restoreBackupName,
      })
      await fetchBackups(filterOpt, page)
    } else if (detail.type === "backupUpdate") {
      await backups.updateBackup({
        appId: app.instance._id,
        backupId: detail.backupId,
        name: detail.name,
      })
      await fetchBackups(filterOpt, page)
    }
  }

  onMount(async () => {
    await fetchBackups(filterOpt, page, startDate, endDate)
    loading = false
  })
</script>

<Layout noPadding>
  <Layout gap="XS" noPadding>
    <div class="title">
      <Heading>Backups</Heading>
      {#if !$licensing.backupsEnabled}
        <Tags>
          <Tag icon="LockClosed">Pro plan</Tag>
        </Tags>
      {/if}
    </div>
    <Body>Back up your apps and restore them to their previous state</Body>
  </Layout>
  <Divider />

  {#if !$licensing.backupsEnabled}
    {#if !$auth.accountPortalAccess && !$licensing.groupsEnabled && $admin.cloud}
      <Body>Contact your account holder to upgrade your plan.</Body>
    {/if}
    <div class="pro-buttons">
      {#if $auth.accountPortalAccess}
        <Button
          primary
          disabled={!$auth.accountPortalAccess && $admin.cloud}
          on:click={$licensing.goToUpgradePage()}
        >
          Upgrade
        </Button>
      {/if}
      <Button
        secondary
        on:click={() => {
          window.open("https://budibase.com/pricing/", "_blank")
        }}
      >
        View plans
      </Button>
    </div>
  {:else if !backupData?.length && !loading && !filterOpt && !startDate}
    <div class="center">
      <Layout noPadding gap="S" justifyItems="center">
        <img height="130px" src={BackupsDefault} alt="BackupsDefault" />
        <Layout noPadding gap="XS">
          <Heading>You have no backups yet</Heading>
          <Body>You can manually back up your app any time</Body>
        </Layout>
        <div>
          <Button cta disabled={loading} on:click={createManualBackup}>
            Create backup
          </Button>
        </div>
      </Layout>
    </div>
  {:else}
    <Layout noPadding gap="M" alignContent="start">
      <div class="controls">
        <div class="search">
          <div class="select">
            <Select
              placeholder="All"
              label="Type"
              options={filters}
              getOptionValue={filter => filter.value}
              getOptionLabel={filter => filter.label}
              bind:value={filterOpt}
            />
          </div>
          <DatePicker
            range={true}
            label="Date Range"
            on:change={e => {
              if (e.detail[0].length > 1) {
                startDate = e.detail[0][0].toISOString()
                endDate = e.detail[0][1].toISOString()
              }
            }}
          />
        </div>
        <div>
          <Button cta disabled={loading} on:click={createManualBackup}
            >Create new backup</Button
          >
        </div>
      </div>
      <div class="table">
        <Table
          {schema}
          disableSorting
          allowSelectRows={false}
          allowEditColumns={false}
          allowEditRows={false}
          data={backupData}
          {customRenderers}
          placeholderText="No backups found"
          border={false}
          on:buttonclick={handleButtonClick}
        />
        <div class="pagination">
          <Pagination
            page={$pageInfo.pageNumber}
            hasPrevPage={$pageInfo.loading ? false : $pageInfo.hasPrevPage}
            hasNextPage={$pageInfo.loading ? false : $pageInfo.hasNextPage}
            goToPrevPage={pageInfo.prevPage}
            goToNextPage={pageInfo.nextPage}
          />
        </div>
      </div>
    </Layout>
  {/if}
</Layout>

<style>
  .title {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;
    gap: var(--spacing-xl);
  }

  .controls {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: flex-end;
    gap: var(--spacing-xl);
    flex-wrap: wrap;
  }

  .search {
    flex: 1 1 auto;
    display: flex;
    gap: var(--spacing-xl);
    align-items: flex-end;
  }
  .search :global(.spectrum-InputGroup) {
    min-width: 100px;
  }

  .select {
    flex-basis: 160px;
    width: 0;
    min-width: 100px;
  }

  .pagination {
    display: flex;
    flex-direction: row;
    justify-content: flex-end;
    margin-top: var(--spacing-xl);
  }

  .title {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: var(--spacing-m);
  }

  .pro-buttons {
    display: flex;
    gap: var(--spacing-m);
  }

  .table {
    overflow-x: scroll;
  }

  .center {
    text-align: center;
    display: contents;
  }
</style>
