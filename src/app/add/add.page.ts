import { Component, OnInit, ViewEncapsulation, AfterViewInit, ViewChild } from '@angular/core';
import { NavController, IonSelect, IonInput, IonSegment, ModalController } from '@ionic/angular';
import { Router } from '@angular/router';
import { MediaService } from '../media.service';
import { Media } from '../media';
import Keyboard from 'simple-keyboard';
import { NgForm } from '@angular/forms';
import { AlbumSearchComponent } from '../album-search/album-search.component';
import { ServiceSearchComponent } from '../service-search/service-search.component';
import { ArtistSearchComponent } from '../artist-search/artist-search.component';
import { ConfigService } from '../config.service';


@Component({
  selector: 'app-add',
  encapsulation: ViewEncapsulation.None,
  templateUrl: './add.page.html',
  styleUrls: [
    './add.page.scss',
    '../../../node_modules/simple-keyboard/build/css/index.css'
  ]
})
export class AddPage implements OnInit, AfterViewInit {
  @ViewChild('select', { static: false }) select: IonSelect;

  source = 'library';
  category = 'audiobook';
  searchType = 'media_id';
  keyboard: Keyboard;
  selectedInputElem: any;
  valid = false;
  spotifyConfigured = false;
  showKeyboard = false;
  isUpperCase = false;
  activeInput: any = null;
  keyboardRows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm']
  ];

  categoryIcons = {
    audiobook: 'book-outline',
    music: 'musical-notes-outline',
    playlist: 'document-text-outline',
    radio: 'radio-outline'
  };

  constructor(
    private mediaService: MediaService,
    private navController: NavController,
    private modalController: ModalController,
    private configService: ConfigService,
    private router: Router
  ) { }

  ngOnInit() {
    this.configService.getConfig().subscribe(config => {
      this.spotifyConfigured = config.spotify?.configured || false;
      if (this.spotifyConfigured && this.source === 'library') {
        this.source = 'spotify';
      }
    });
  }

  ngAfterViewInit() {

    this.keyboard = new Keyboard({
      onChange: input => {
        this.selectedInputElem.value = input;
        this.validate();
      },
      onKeyPress: button => {
        this.handleLayoutChange(button);
      },
      theme: 'hg-theme-default hg-theme-ios',
      layout: {
        default: [
          'q w e r t z u i o p ü',
          'a s d f g h j k l ö ä',
          '{shift} y x c v b n m {shift}',
          '{alt} {space} . {bksp}'
        ],
        shift: [
          'Q W E R T Z U I O P Ü',
          'A S D F G H J K L Ö Ä',
          '{shiftactivated} Y X C V B N M {shift}',
          '{alt} {space} . {bksp}'
        ],
        alt: [
          '1 2 3 4 5 6 7 8 9 0 =',
          `% @ # $ & * / ( ) ' "`,
          '{shift} , - + ; : ! ? {shift}',
          '{default} {space} . {bksp}'
        ]
      },
      display: {
        '{alt}': '123',
        '{smileys}': '\uD83D\uDE03',
        '{shift}': '⇧',
        '{shiftactivated}': '⇧',
        '{enter}': '⮐ ',
        '{bksp}': '⌫',
        '{altright}': '123',
        '{downkeyboard}': '🞃',
        '{space}': ' ',
        '{default}': 'ABC',
        '{back}': '⇦'
      }
    });

    this.selectedInputElem = document.querySelector('ion-input:first-child');
  }

  cancelButtonPressed() {
    this.navController.back();
  }

  categoryButtonPressed(event: any) {
    this.select.open(event);
  }

  categoryChanged() {
    if (this.category === 'radio' && this.source !== 'tunein') {
      this.source = 'tunein';
    } else if (this.category !== 'radio' && this.source === 'tunein') {
      this.source = 'spotify';
    }

    this.validate();
  }

  searchTypeChanged() {
    this.validate();
  }

  focusChanged(event: any) {
    this.selectedInputElem = event.target;
    this.activeInput = event.target;

    if (this.keyboard) {
      this.keyboard.setOptions({
        inputName: event.target.name
      });
    }
  }

  inputChanged(event: any) {
    this.keyboard.setInput(event.target.value, event.target.name);
    this.validate();
  }

  handleLayoutChange(button) {
    const currentLayout = this.keyboard.options.layoutName;
    let layout: string;

    switch (button) {
      case '{shift}':
      case '{shiftactivated}':
      case '{default}':
        layout = currentLayout === 'default' ? 'shift' : 'default';
        break;
      case '{alt}':
      case '{altright}':
        layout = currentLayout === 'alt' ? 'default' : 'alt';
        break;
      case '{smileys}':
        layout = currentLayout === 'smileys' ? 'default' : 'smileys';
        break;
      default:
        break;
    }

    if (layout) {
      this.keyboard.setOptions({
        layoutName: layout
      });
    }
  }

  segmentChanged(event: any) {
    this.source = event.detail.value;
    window.setTimeout(() => { // wait for new elements to be visible before altering them
      this.validate();
    }, 10);
  }

  submit(form: NgForm) {
    const media: Media = {
      type: this.source,
      category: this.category
    };

    if (this.source === 'spotify') {
      if (form.form.value.spotify_artist?.length) { media.artist = form.form.value.spotify_artist; }
      if (form.form.value.spotify_title?.length) { media.title = form.form.value.spotify_title; }
      if (form.form.value.spotify_query?.length) { media.query = form.form.value.spotify_query; }
      if (form.form.value.spotify_id?.length) { media.id = form.form.value.spotify_id; }
      if (form.form.value.spotify_artistid?.length) { media.artistid = form.form.value.spotify_artistid; }

    } else if (this.source === 'library') {
      if (form.form.value.library_artist?.length) { media.artist = form.form.value.library_artist; }
      if (form.form.value.library_title?.length) { media.title = form.form.value.library_title; }
      if (form.form.value.library_cover?.length) { media.cover = form.form.value.library_cover; }

    } else if (this.source === 'amazonmusic') {
      if (form.form.value.amazonmusic_artist?.length) { media.artist = form.form.value.amazonmusic_artist; }
      if (form.form.value.amazonmusic_title?.length) { media.title = form.form.value.amazonmusic_title; }
      if (form.form.value.amazonmusic_cover?.length) { media.cover = form.form.value.amazonmusic_cover; }
      if (form.form.value.amazonmusic_id?.length) { media.id = form.form.value.amazonmusic_id; }

    } else if (this.source === 'applemusic') {
      if (form.form.value.applemusic_artist?.length) { media.artist = form.form.value.applemusic_artist; }
      if (form.form.value.applemusic_title?.length) { media.title = form.form.value.applemusic_title; }
      if (form.form.value.applemusic_cover?.length) { media.cover = form.form.value.applemusic_cover; }
      if (form.form.value.applemusic_id?.length) { media.id = form.form.value.applemusic_id; }

    } else if (this.source === 'tunein') {
      if (form.form.value.tunein_title?.length) { media.title = form.form.value.tunein_title; }
      if (form.form.value.tunein_cover?.length) { media.cover = form.form.value.tunein_cover; }
      if (form.form.value.tunein_id?.length) { media.id = form.form.value.tunein_id; }
    }

    this.mediaService.addRawMedia(media);

    form.reset();

    this.keyboard.clearInput('spotify_artist');
    this.keyboard.clearInput('spotify_title');
    this.keyboard.clearInput('spotify_id');
    this.keyboard.clearInput('spotify_artistid');
    this.keyboard.clearInput('spotify_query');

    this.keyboard.clearInput('library_artist');
    this.keyboard.clearInput('library_title');
    this.keyboard.clearInput('library_cover');

    this.keyboard.clearInput('amazonmusic_artist');
    this.keyboard.clearInput('amazonmusic_title');
    this.keyboard.clearInput('amazonmusic_id');
    this.keyboard.clearInput('amazonmusic_cover');

    this.keyboard.clearInput('applemusic_artist');
    this.keyboard.clearInput('applemusic_title');
    this.keyboard.clearInput('applemusic_id');
    this.keyboard.clearInput('applemusic_cover');

    this.keyboard.clearInput('tunein_title');
    this.keyboard.clearInput('tunein_id');
    this.keyboard.clearInput('tunein_cover');

    this.validate();
    this.reloadHome();

    this.router.navigate(['/config']);
  }

  reloadHome() {
    // Trigger home page reload by updating media service
    this.mediaService.updateRawMedia();
  }

  async openAlbumSearch() {
    const modal = await this.modalController.create({
      component: AlbumSearchComponent,
      cssClass: 'album-search-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.addAlbumFromSearch(result.data);
      }
    });

    return await modal.present();
  }

  async openServiceSearch(service: 'applemusic' | 'amazonmusic' | 'tunein') {
    const modal = await this.modalController.create({
      component: ServiceSearchComponent,
      componentProps: {
        service: service,
        category: this.category
      },
      cssClass: 'service-search-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.addAlbumFromSearch(result.data);
      }
    });

    return await modal.present();
  }

  async openArtistSearch() {
    const modal = await this.modalController.create({
      component: ArtistSearchComponent,
      cssClass: 'artist-search-modal'
    });

    modal.onDidDismiss().then((result) => {
      if (result.data) {
        this.addArtistFromSearch(result.data);
      }
    });

    return await modal.present();
  }

  addAlbumFromSearch(album: Media) {
    album.category = this.category;
    this.mediaService.addRawMedia(album);
    this.reloadHome();
  }

  addArtistFromSearch(artist: any) {
    const media: Media = {
      artistid: artist.id,
      artist: artist.name,
      title: `All ${artist.name} Albums`,
      cover: artist.image,
      type: 'spotify',
      category: this.category
    };
    this.mediaService.addRawMedia(media);
    this.reloadHome();
  }

  toggleKeyboard() {
    this.showKeyboard = !this.showKeyboard;
  }

  hideKeyboard() {
    this.showKeyboard = false;
  }

  addKey(key: string) {
    if (this.activeInput) {
      const currentValue = this.activeInput.value || '';
      const newValue = currentValue + (this.isUpperCase ? key.toUpperCase() : key);
      this.activeInput.value = newValue;
      this.activeInput.dispatchEvent(new Event('input'));
      this.validate();
    }
  }

  backspace() {
    if (this.activeInput) {
      const currentValue = this.activeInput.value || '';
      const newValue = currentValue.slice(0, -1);
      this.activeInput.value = newValue;
      this.activeInput.dispatchEvent(new Event('input'));
      this.validate();
    }
  }

  toggleCase() {
    this.isUpperCase = !this.isUpperCase;
  }

  validate() {
    if (this.category === 'playlist') {
      this.searchType = 'media_id';
    }

    const inputs = this.keyboard ? {
      spotify_artist: this.keyboard.getInput('spotify_artist'),
      spotify_title: this.keyboard.getInput('spotify_title'),
      spotify_id: this.keyboard.getInput('spotify_id'),
      spotify_artistid: this.keyboard.getInput('spotify_artistid'),
      spotify_query: this.keyboard.getInput('spotify_query'),
      library_artist: this.keyboard.getInput('library_artist'),
      library_title: this.keyboard.getInput('library_title')
    } : {};

    switch (this.source) {
      case 'spotify':
        this.valid = this.category === 'playlist' ? 
          !!inputs.spotify_id :
          !!(inputs.spotify_artist && inputs.spotify_title) || !!inputs.spotify_query || !!inputs.spotify_id || !!inputs.spotify_artistid;
        break;
      case 'library':
        this.valid = !!(inputs.library_artist && inputs.library_title);
        break;
      default:
        this.valid = false;
    }
  }
}
